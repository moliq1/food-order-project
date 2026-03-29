<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { adminApi } from "../../api";
import { formatCurrency, formatTime, statusText } from "../../utils/format";

const orders = ref([]);
const timer = ref(null);
const loading = ref(false);
const noticeText = ref("");
const activeOrderTab = ref("pending");

const pendingOrders = computed(() => orders.value.filter((item) => item.status === "pending"));
const acceptedOrders = computed(() => orders.value.filter((item) => item.status === "accepted"));
const completedOrders = computed(() => orders.value.filter((item) => ["completed", "rejected", "cancelled"].includes(item.status)));

const visibleOrders = computed(() => {
  if (activeOrderTab.value === "pending") {
    return pendingOrders.value;
  }
  if (activeOrderTab.value === "accepted") {
    return acceptedOrders.value;
  }
  return completedOrders.value;
});

async function loadOrders(showToast = false) {
  loading.value = true;
  try {
    const previousPending = pendingOrders.value.length;
    const response = await adminApi.orders({ page: 1, limit: 50 });
    orders.value = response.data.list;
    if (pendingOrders.value.length > previousPending) {
      noticeText.value = `新增 ${pendingOrders.value.length - previousPending} 笔待处理订单`;
      if (showToast) {
        ElMessage.success("有新的待处理订单");
      }
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
    <section class="glass-card merchant-hero">
      <div class="hero-row">
        <div>
          <h1 class="page-title">接单工作台</h1>
          <p class="page-subtitle">适合手机值守，核心动作都集中在订单卡片底部。</p>
        </div>
        <router-link class="back-link" to="/admin">后台</router-link>
      </div>

      <div class="hero-stats">
        <div class="hero-stat">
          <span>待处理</span>
          <strong>{{ pendingOrders.length }}</strong>
        </div>
        <div class="hero-stat">
          <span>制作中</span>
          <strong>{{ acceptedOrders.length }}</strong>
        </div>
        <div class="hero-stat online">
          <span>接单状态</span>
          <strong>在线</strong>
        </div>
      </div>

      <div v-if="noticeText" class="notice-banner">{{ noticeText }}</div>

      <div class="toolbar">
        <div class="app-pill-group mobile-scroll">
          <button
            class="app-pill"
            :class="{ 'is-active': activeOrderTab === 'pending' }"
            type="button"
            @click="activeOrderTab = 'pending'"
          >
            待处理
          </button>
          <button
            class="app-pill"
            :class="{ 'is-active': activeOrderTab === 'accepted' }"
            type="button"
            @click="activeOrderTab = 'accepted'"
          >
            进行中
          </button>
          <button
            class="app-pill"
            :class="{ 'is-active': activeOrderTab === 'completed' }"
            type="button"
            @click="activeOrderTab = 'completed'"
          >
            已结束
          </button>
        </div>
        <el-button :loading="loading" @click="loadOrders(true)">刷新</el-button>
      </div>
    </section>

    <section class="card-list">
      <article v-for="order in visibleOrders" :key="order.id" class="order-card glass-card">
        <div class="order-head">
          <div>
            <strong>{{ order.customer_name }} · {{ order.customer_phone.slice(-4) }}</strong>
            <p>{{ formatTime(order.created_at) }}</p>
          </div>
          <span
            class="status-chip"
            :class="order.status === 'pending' ? 'warning' : order.status === 'accepted' ? 'success' : 'muted'"
          >
            {{ statusText(order.status) }}
          </span>
        </div>

        <div class="order-meta">
          <span>订单号 {{ order.order_no }}</span>
          <strong>{{ formatCurrency(order.total_amount) }}</strong>
        </div>

        <div class="order-items">
          <div v-for="item in order.items || []" :key="item.id">{{ item.dish_name }} x {{ item.quantity }}</div>
        </div>

        <div v-if="order.status === 'pending'" class="order-actions dual">
          <el-button type="success" @click="updateOrder(order.id, 'accept')">接单</el-button>
          <el-button type="danger" plain @click="updateOrder(order.id, 'reject')">拒绝</el-button>
        </div>
        <div v-else-if="order.status === 'accepted'" class="order-actions">
          <el-button type="primary" @click="updateOrder(order.id, 'complete')">标记完成</el-button>
        </div>
      </article>

      <el-empty v-if="!visibleOrders.length" description="当前分组下暂无订单" />
    </section>
  </div>
</template>

<style scoped>
.merchant-page {
  display: grid;
  gap: 14px;
}

.merchant-hero,
.order-card {
  padding: 16px;
}

.hero-row,
.toolbar,
.order-head,
.order-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.back-link {
  min-height: 36px;
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--brand-deep);
  font-weight: 700;
}

.merchant-hero {
  display: grid;
  gap: 14px;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.hero-stat {
  padding: 12px;
  border-radius: var(--radius-md);
  background: var(--surface-soft);
  display: grid;
  gap: 6px;
}

.hero-stat.online {
  background: rgba(31, 143, 85, 0.1);
}

.hero-stat span,
.order-head p,
.order-items,
.order-meta span {
  margin: 0;
  color: var(--soft);
  font-size: 12px;
}

.notice-banner {
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  background: rgba(213, 90, 42, 0.1);
  color: var(--brand-deep);
  font-weight: 700;
}

.toolbar {
  align-items: stretch;
}

.toolbar .app-pill-group {
  flex: 1;
  overflow-x: auto;
}

.order-card {
  display: grid;
  gap: 14px;
}

.order-head strong,
.order-meta strong {
  font-size: 16px;
}

.order-items {
  display: grid;
  gap: 8px;
}

.order-actions,
.order-actions.dual {
  display: grid;
  gap: 10px;
}

.order-actions.dual {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (min-width: 768px) {
  .merchant-page {
    width: min(100%, 860px);
    margin: 0 auto;
  }

  .card-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
