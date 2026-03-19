<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { adminApi } from "../../api";
import { formatCurrency, formatTime, statusText } from "../../utils/format";

const orders = ref([]);
const timer = ref(null);
const loading = ref(false);
const pendingOrders = computed(() => orders.value.filter((item) => item.status === "pending"));
const acceptedOrders = computed(() => orders.value.filter((item) => item.status === "accepted"));

async function loadOrders(showToast = false) {
  loading.value = true;
  try {
    const response = await adminApi.orders({ page: 1, limit: 50 });
    const previousPending = pendingOrders.value.length;
    orders.value = response.data.list;
    if (showToast && pendingOrders.value.length > previousPending) {
      ElMessage.success("有新的待处理订单");
    }
  } finally {
    loading.value = false;
  }
}

async function updateOrder(id, action) {
  const actionMap = {
    accept: adminApi.acceptOrder,
    reject: adminApi.rejectOrder,
    complete: adminApi.completeOrder
  };
  await actionMap[action](id);
  await loadOrders();
  ElMessage.success("订单状态已更新");
}

function startPolling() {
  timer.value = window.setInterval(() => {
    if (document.visibilityState === "visible") {
      loadOrders(true);
    }
  }, 30000);
}

onMounted(async () => {
  await loadOrders();
  startPolling();
});

onBeforeUnmount(() => {
  if (timer.value) {
    clearInterval(timer.value);
  }
});
</script>

<template>
  <div class="page-shell merchant-page">
    <header class="glass-card merchant-header">
      <div>
        <p class="hero-tag">Merchant Service</p>
        <h1 class="page-title">商家接单端</h1>
        <p class="page-subtitle">页面每 30 秒自动轮询新订单，切到后台标签页时会暂停轮询。</p>
      </div>
      <div class="header-actions">
        <router-link to="/admin">返回后台</router-link>
        <el-button :loading="loading" @click="loadOrders(true)">立即刷新</el-button>
      </div>
    </header>

    <section class="merchant-grid">
      <div class="glass-card column">
        <div class="column-head">
          <h2 class="section-title">待接单</h2>
          <el-tag type="warning">{{ pendingOrders.length }}</el-tag>
        </div>
        <div v-if="pendingOrders.length" class="order-stack">
          <article v-for="order in pendingOrders" :key="order.id" class="order-card pending">
            <div class="order-main">
              <strong>{{ order.order_no }}</strong>
              <span>{{ order.customer_name }} / {{ order.customer_phone }}</span>
              <span>{{ formatCurrency(order.total_amount) }}</span>
              <small>{{ formatTime(order.created_at) }}</small>
            </div>
            <div class="quick-actions">
              <el-button type="success" @click="updateOrder(order.id, 'accept')">接单</el-button>
              <el-button type="danger" plain @click="updateOrder(order.id, 'reject')">拒绝</el-button>
            </div>
          </article>
        </div>
        <el-empty v-else description="当前没有待接订单" />
      </div>

      <div class="glass-card column">
        <div class="column-head">
          <h2 class="section-title">进行中订单</h2>
          <el-tag type="success">{{ acceptedOrders.length }}</el-tag>
        </div>
        <div v-if="acceptedOrders.length" class="order-stack">
          <article v-for="order in acceptedOrders" :key="order.id" class="order-card active">
            <div class="order-main">
              <strong>{{ order.order_no }}</strong>
              <span>{{ order.customer_name }}</span>
              <span>{{ statusText(order.status) }}</span>
              <small>{{ formatCurrency(order.total_amount) }}</small>
            </div>
            <el-button type="primary" @click="updateOrder(order.id, 'complete')">标记完成</el-button>
          </article>
        </div>
        <el-empty v-else description="暂无制作中的订单" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.merchant-page {
  display: grid;
  gap: 24px;
}

.merchant-header,
.header-actions,
.column-head,
.quick-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.merchant-header,
.column {
  padding: 24px;
}

.merchant-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.column {
  min-height: 420px;
}

.order-stack {
  display: grid;
  gap: 14px;
}

.order-card {
  display: grid;
  gap: 14px;
  padding: 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.58);
}

.order-card.pending {
  border-left: 4px solid #d97706;
}

.order-card.active {
  border-left: 4px solid #15803d;
}

.order-main {
  display: grid;
  gap: 8px;
}

.header-actions {
  flex-wrap: wrap;
}

.hero-tag {
  color: var(--brand);
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

@media (max-width: 900px) {
  .merchant-grid {
    grid-template-columns: 1fr;
  }

  .merchant-header,
  .header-actions,
  .quick-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .merchant-header,
  .column {
    padding: 18px 16px;
  }

  .column {
    min-height: auto;
  }
}

@media (max-width: 768px) {
  .merchant-page {
    gap: 16px;
  }

  .column-head {
    align-items: center;
  }

  .quick-actions :deep(.el-button) {
    width: 100%;
  }
}
</style>
