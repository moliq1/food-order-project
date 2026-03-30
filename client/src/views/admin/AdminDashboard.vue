<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useRouter } from "vue-router";
import { adminApi } from "../../api";
import { useAuthStore } from "../../stores/auth";
import { formatCurrency, formatTime, statusText } from "../../utils/format";
import { getDishImageUrl, handleDishImageError } from "../../utils/media";

const router = useRouter();
const authStore = useAuthStore();

const activeAdminSection = ref("overview");
const filterSheetVisible = ref(false);
const page = ref(1);
const total = ref(0);

const stats = ref({ today_orders: 0, today_revenue: 0, pending_count: 0 });
const categories = ref([]);
const dishes = ref([]);
const orders = ref([]);

const filters = reactive({ status: "", start_date: "", end_date: "" });

const categoryDialog = reactive({ visible: false, form: { id: null, name: "", sort_order: 0 } });
const dishDialog = reactive({
  visible: false,
  form: { id: null, name: "", price: 0, description: "", category_id: "", image_url: "", is_available: 1 }
});

const categoryOptions = computed(() => categories.value.map((item) => ({ label: item.name, value: item.id })));

async function loadAll() {
  const [statsRes, categoryRes, dishRes, orderRes] = await Promise.all([
    adminApi.stats(),
    adminApi.categories(),
    adminApi.dishes(),
    adminApi.orders({ page: page.value, limit: 20, ...filters })
  ]);

  stats.value = statsRes.data;
  categories.value = categoryRes.data;
  dishes.value = dishRes.data;
  orders.value = orderRes.data.list;
  total.value = orderRes.data.total;
}

function openCategoryDialog(item = null) {
  categoryDialog.visible = true;
  categoryDialog.form = item ? { ...item } : { id: null, name: "", sort_order: categories.value.length + 1 };
}

async function saveCategory() {
  if (categoryDialog.form.id) {
    await adminApi.updateCategory(categoryDialog.form.id, categoryDialog.form);
  } else {
    await adminApi.createCategory(categoryDialog.form);
  }
  categoryDialog.visible = false;
  ElMessage.success("分类已保存");
  await loadAll();
}

async function removeCategory(id) {
  await ElMessageBox.confirm("删除分类前请确保没有菜品关联。", "提示");
  await adminApi.deleteCategory(id);
  ElMessage.success("分类已删除");
  await loadAll();
}

function openDishDialog(item = null) {
  dishDialog.visible = true;
  dishDialog.form = item
    ? { ...item }
    : { id: null, name: "", price: 0, description: "", category_id: categories.value[0]?.id || "", image_url: "", is_available: 1 };
}

async function saveDish() {
  if (dishDialog.form.id) {
    await adminApi.updateDish(dishDialog.form.id, dishDialog.form);
  } else {
    await adminApi.createDish(dishDialog.form);
  }
  dishDialog.visible = false;
  ElMessage.success("菜品已保存");
  await loadAll();
}

async function uploadImage(uploadFile) {
  const formData = new FormData();
  formData.append("file", uploadFile.raw);
  const response = await adminApi.upload(formData);
  dishDialog.form.image_url = response.data.url;
}

async function toggleDish(id) {
  await adminApi.toggleDish(id);
  await loadAll();
}

async function removeDish(id) {
  await ElMessageBox.confirm("确定删除这道菜品吗？", "提示");
  await adminApi.deleteDish(id);
  ElMessage.success("菜品已删除");
  await loadAll();
}

async function handleOrder(id, action) {
  const handlerMap = {
    accept: adminApi.acceptOrder,
    reject: adminApi.rejectOrder,
    complete: adminApi.completeOrder,
    cancel: adminApi.cancelOrder
  };
  await handlerMap[action](id);
  ElMessage.success("订单状态已更新");
  await loadAll();
}

async function removeOrder(id) {
  await ElMessageBox.confirm("删除后无法恢复，订单记录和明细都会被移除。", "提示");
  await adminApi.deleteOrder(id);
  ElMessage.success("订单已删除");
  await loadAll();
}

async function applyFilters() {
  page.value = 1;
  filterSheetVisible.value = false;
  await loadAll();
}

async function changePage(nextPage) {
  if (nextPage < 1) return;
  page.value = nextPage;
  await loadAll();
}

function logout() {
  authStore.logout();
  router.push("/login");
}

onMounted(loadAll);
</script>

<template>
  <div class="page-shell admin-page">
    <section class="glass-card admin-hero">
      <div class="hero-header">
        <div>
          <h1 class="page-title">商家后台</h1>
          <p class="page-subtitle">默认按手机管理场景排布，概览、菜品、订单都能单手完成高频操作。</p>
        </div>
        <el-button plain @click="logout">退出</el-button>
      </div>

      <div class="app-pill-group mobile-scroll">
        <button
          class="app-pill"
          :class="{ 'is-active': activeAdminSection === 'overview' }"
          type="button"
          @click="activeAdminSection = 'overview'"
        >
          概览
        </button>
        <button
          class="app-pill"
          :class="{ 'is-active': activeAdminSection === 'categories' }"
          type="button"
          @click="activeAdminSection = 'categories'"
        >
          分类
        </button>
        <button
          class="app-pill"
          :class="{ 'is-active': activeAdminSection === 'dishes' }"
          type="button"
          @click="activeAdminSection = 'dishes'"
        >
          菜品
        </button>
        <button
          class="app-pill"
          :class="{ 'is-active': activeAdminSection === 'orders' }"
          type="button"
          @click="activeAdminSection = 'orders'"
        >
          订单
        </button>
      </div>
    </section>

    <section v-if="activeAdminSection === 'overview'" class="stats-grid">
      <div class="stat-card glass-card">
        <span>今日订单</span>
        <strong>{{ stats.today_orders }}</strong>
      </div>
      <div class="stat-card glass-card">
        <span>今日营业额</span>
        <strong>{{ formatCurrency(stats.today_revenue) }}</strong>
      </div>
      <div class="stat-card glass-card">
        <span>待处理订单</span>
        <strong>{{ stats.pending_count }}</strong>
      </div>
      <router-link class="shortcut-card glass-card" to="/merchant">
        <strong>进入接单工作台</strong>
        <span>处理待接单与制作中订单</span>
      </router-link>
    </section>

    <section v-else-if="activeAdminSection === 'categories'" class="section-block">
      <div class="section-toolbar">
        <div>
          <h2 class="section-title">分类管理</h2>
          <p class="page-subtitle">按卡片查看和调整顺序。</p>
        </div>
        <el-button type="primary" @click="openCategoryDialog()">新增</el-button>
      </div>

      <div class="card-list">
        <article v-for="category in categories" :key="category.id" class="admin-card glass-card">
          <div class="admin-card-head">
            <div>
              <strong>{{ category.name }}</strong>
              <p>排序 {{ category.sort_order }}</p>
            </div>
          </div>
          <div class="admin-card-actions">
            <el-button @click="openCategoryDialog(category)">编辑</el-button>
            <el-button type="danger" plain @click="removeCategory(category.id)">删除</el-button>
          </div>
        </article>
      </div>
    </section>

    <section v-else-if="activeAdminSection === 'dishes'" class="section-block">
      <div class="section-toolbar">
        <div>
          <h2 class="section-title">菜品管理</h2>
          <p class="page-subtitle">图片、分类、价格和上架状态集中在一张卡片里。</p>
        </div>
        <el-button type="primary" @click="openDishDialog()">新增</el-button>
      </div>

      <div class="card-list">
        <article v-for="dish in dishes" :key="dish.id" class="admin-card dish-card glass-card">
          <img :src="getDishImageUrl(dish)" :alt="dish.name" @error="(event) => handleDishImageError(event, dish.name)" />
          <div class="dish-card-copy">
            <div class="admin-card-head">
              <div>
                <strong>{{ dish.name }}</strong>
                <p>{{ dish.category_name }} · {{ formatCurrency(dish.price) }}</p>
              </div>
              <span class="status-chip" :class="dish.is_available ? 'success' : 'muted'">
                {{ dish.is_available ? "上架中" : "已下架" }}
              </span>
            </div>
            <p class="dish-desc">{{ dish.description || "暂无描述" }}</p>
            <div class="admin-card-actions stack">
              <el-button @click="openDishDialog(dish)">编辑</el-button>
              <el-button @click="toggleDish(dish.id)">{{ dish.is_available ? "下架" : "上架" }}</el-button>
              <el-button type="danger" plain @click="removeDish(dish.id)">删除</el-button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section v-else class="section-block">
      <div class="section-toolbar">
        <div>
          <h2 class="section-title">订单管理</h2>
          <p class="page-subtitle">筛选收进底部面板，列表改为可扫读订单卡片。</p>
        </div>
        <el-button @click="filterSheetVisible = true">筛选</el-button>
      </div>

      <div class="card-list">
        <article v-for="order in orders" :key="order.id" class="admin-card glass-card">
          <div class="admin-card-head">
            <div>
              <strong>{{ order.customer_name }} · {{ order.customer_phone }}</strong>
              <p>{{ order.order_no }}</p>
            </div>
            <span
              class="status-chip"
              :class="order.status === 'pending' ? 'warning' : order.status === 'accepted' ? 'success' : 'muted'"
            >
              {{ statusText(order.status) }}
            </span>
          </div>

          <div class="order-summary">
            <span>{{ formatTime(order.created_at) }}</span>
            <strong>{{ formatCurrency(order.total_amount) }}</strong>
          </div>

          <div class="admin-card-actions stack">
            <el-button v-if="order.status === 'pending'" type="success" @click="handleOrder(order.id, 'accept')">接单</el-button>
            <el-button v-if="order.status === 'pending'" type="danger" plain @click="handleOrder(order.id, 'reject')">拒绝</el-button>
            <el-button v-if="order.status === 'accepted'" type="primary" @click="handleOrder(order.id, 'complete')">完成</el-button>
            <el-button
              v-if="['pending', 'accepted'].includes(order.status)"
              type="warning"
              plain
              @click="handleOrder(order.id, 'cancel')"
            >
              取消
            </el-button>
            <el-button type="danger" plain @click="removeOrder(order.id)">删除</el-button>
          </div>
        </article>
      </div>

      <div class="pager glass-card">
        <el-button plain :disabled="page <= 1" @click="changePage(page - 1)">上一页</el-button>
        <span>第 {{ page }} 页 / 共 {{ Math.max(1, Math.ceil(total / 20)) }} 页</span>
        <el-button plain :disabled="page >= Math.ceil(total / 20) || total === 0" @click="changePage(page + 1)">下一页</el-button>
      </div>
    </section>

    <el-drawer
      v-model="filterSheetVisible"
      direction="btt"
      size="64%"
      :with-header="false"
      class="mobile-sheet"
    >
      <div class="app-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-title">
          <strong>订单筛选</strong>
        </div>
        <div class="compact-form">
          <el-select v-model="filters.status" clearable placeholder="状态">
            <el-option label="待接单" value="pending" />
            <el-option label="已接单" value="accepted" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
          <el-date-picker v-model="filters.start_date" type="date" value-format="YYYY-MM-DD" placeholder="开始日期" />
          <el-date-picker v-model="filters.end_date" type="date" value-format="YYYY-MM-DD" placeholder="结束日期" />
          <el-button type="primary" @click="applyFilters">应用筛选</el-button>
        </div>
      </div>
    </el-drawer>

    <el-drawer
      v-model="categoryDialog.visible"
      direction="btt"
      size="54%"
      :with-header="false"
      class="mobile-sheet"
    >
      <div class="app-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-title">
          <strong>{{ categoryDialog.form.id ? "编辑分类" : "新增分类" }}</strong>
        </div>
        <el-form :model="categoryDialog.form" label-position="top" class="compact-form">
          <el-form-item label="名称">
            <el-input v-model="categoryDialog.form.name" />
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number v-model="categoryDialog.form.sort_order" :min="0" />
          </el-form-item>
        </el-form>
        <div class="sheet-total">
          <span></span>
          <el-button type="primary" @click="saveCategory">保存</el-button>
        </div>
      </div>
    </el-drawer>

    <el-drawer
      v-model="dishDialog.visible"
      direction="btt"
      size="88%"
      :with-header="false"
      class="mobile-sheet"
    >
      <div class="app-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-title">
          <strong>{{ dishDialog.form.id ? "编辑菜品" : "新增菜品" }}</strong>
        </div>
        <el-form :model="dishDialog.form" label-position="top" class="compact-form">
          <el-form-item label="菜品名称">
            <el-input v-model="dishDialog.form.name" />
          </el-form-item>
          <el-form-item label="价格">
            <el-input-number v-model="dishDialog.form.price" :min="0" :step="1" />
          </el-form-item>
          <el-form-item label="分类">
            <el-select v-model="dishDialog.form.category_id">
              <el-option v-for="item in categoryOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="描述">
            <el-input v-model="dishDialog.form.description" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item label="图片">
            <el-input v-model="dishDialog.form.image_url" placeholder="图片链接或上传图片" />
            <el-upload :show-file-list="false" :auto-upload="false" accept="image/*" :on-change="uploadImage">
              <el-button plain>上传图片</el-button>
            </el-upload>
          </el-form-item>
          <el-form-item label="上架状态">
            <el-switch v-model="dishDialog.form.is_available" :active-value="1" :inactive-value="0" />
          </el-form-item>
        </el-form>
        <div class="sheet-total">
          <span></span>
          <el-button type="primary" @click="saveDish">保存</el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.admin-page {
  display: grid;
  gap: 14px;
}

.admin-hero,
.stat-card,
.shortcut-card,
.admin-card,
.pager {
  padding: 16px;
}

.admin-hero,
.section-block,
.stat-card,
.shortcut-card,
.admin-card {
  display: grid;
  gap: 14px;
}

.hero-header,
.section-toolbar,
.admin-card-head,
.order-summary,
.pager,
.sheet-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.stats-grid {
  display: grid;
  gap: 12px;
}

.stat-card span,
.shortcut-card span,
.admin-card-head p,
.dish-desc,
.order-summary span {
  margin: 0;
  color: var(--soft);
  font-size: 12px;
  line-height: 1.55;
}

.stat-card strong {
  font-size: 28px;
}

.shortcut-card strong,
.admin-card-head strong,
.order-summary strong {
  font-size: 16px;
}

.shortcut-card {
  color: inherit;
}

.admin-card-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.admin-card-actions.stack {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.dish-card {
  grid-template-columns: 92px minmax(0, 1fr);
  align-items: start;
}

.dish-card img {
  width: 92px;
  height: 92px;
  object-fit: cover;
  border-radius: var(--radius-md);
}

.dish-card-copy {
  display: grid;
  gap: 12px;
}

.order-summary {
  padding: 12px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.pager {
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid var(--line);
}

@media (min-width: 768px) {
  .admin-page {
    width: min(100%, 960px);
    margin: 0 auto;
  }

  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .card-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
