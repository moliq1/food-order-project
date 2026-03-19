<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useRouter } from "vue-router";
import { adminApi } from "../../api";
import { useAuthStore } from "../../stores/auth";
import { formatCurrency, formatTime, statusText } from "../../utils/format";

const router = useRouter();
const authStore = useAuthStore();
const activeTab = ref("stats");
const stats = ref({ today_orders: 0, today_revenue: 0, pending_count: 0 });
const categories = ref([]);
const dishes = ref([]);
const orders = ref([]);
const total = ref(0);
const page = ref(1);
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

function logout() {
  authStore.logout();
  router.push("/login");
}

onMounted(loadAll);
</script>

<template>
  <div class="page-shell admin-page">
    <header class="glass-card admin-header">
      <div>
        <p class="hero-tag">Admin Studio</p>
        <h1 class="page-title">商家后台管理</h1>
        <p class="page-subtitle">统一管理分类、菜品、订单与今日营业概况。</p>
      </div>
      <div class="admin-actions">
        <router-link to="/merchant">接单端</router-link>
        <el-button plain @click="logout">退出登录</el-button>
      </div>
    </header>

    <el-tabs v-model="activeTab" class="glass-card tabs-shell">
      <el-tab-pane label="数据统计" name="stats">
        <div class="stats-grid">
          <div class="stat-card">
            <span>今日订单</span>
            <strong>{{ stats.today_orders }}</strong>
          </div>
          <div class="stat-card">
            <span>今日营业额</span>
            <strong>{{ formatCurrency(stats.today_revenue) }}</strong>
          </div>
          <div class="stat-card">
            <span>待处理订单</span>
            <strong>{{ stats.pending_count }}</strong>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="分类管理" name="categories">
        <div class="section-head">
          <h2 class="section-title">菜品分类</h2>
          <el-button type="primary" @click="openCategoryDialog()">新增分类</el-button>
        </div>
        <div class="mobile-scroll table-wrap">
          <el-table :data="categories">
            <el-table-column prop="name" label="名称" min-width="160" />
            <el-table-column prop="sort_order" label="排序" width="120" />
            <el-table-column label="操作" width="180">
              <template #default="{ row }">
                <el-button link @click="openCategoryDialog(row)">编辑</el-button>
                <el-button link type="danger" @click="removeCategory(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="菜品管理" name="dishes">
        <div class="section-head">
          <h2 class="section-title">菜品列表</h2>
          <el-button type="primary" @click="openDishDialog()">新增菜品</el-button>
        </div>
        <div class="mobile-scroll table-wrap">
          <el-table :data="dishes">
            <el-table-column prop="name" label="菜品" min-width="160" />
            <el-table-column prop="category_name" label="分类" min-width="120" />
            <el-table-column prop="price" label="价格" width="120">
              <template #default="{ row }">{{ formatCurrency(row.price) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="110">
              <template #default="{ row }">
                <el-tag :type="row.is_available ? 'success' : 'info'">{{ row.is_available ? "上架" : "下架" }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="220">
              <template #default="{ row }">
                <el-button link @click="openDishDialog(row)">编辑</el-button>
                <el-button link @click="toggleDish(row.id)">{{ row.is_available ? "下架" : "上架" }}</el-button>
                <el-button link type="danger" @click="removeDish(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="订单管理" name="orders">
        <div class="filters">
          <el-select v-model="filters.status" clearable placeholder="状态">
            <el-option label="待接单" value="pending" />
            <el-option label="已接单" value="accepted" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
          <el-date-picker v-model="filters.start_date" type="date" value-format="YYYY-MM-DD" placeholder="开始日期" />
          <el-date-picker v-model="filters.end_date" type="date" value-format="YYYY-MM-DD" placeholder="结束日期" />
          <el-button type="primary" @click="loadAll">筛选</el-button>
        </div>
        <div class="mobile-scroll table-wrap">
          <el-table :data="orders">
            <el-table-column prop="order_no" label="订单号" width="180" />
            <el-table-column prop="customer_name" label="顾客" width="120" />
            <el-table-column prop="customer_phone" label="电话" width="150" />
            <el-table-column prop="total_amount" label="金额" width="120">
              <template #default="{ row }">{{ formatCurrency(row.total_amount) }}</template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="120">
              <template #default="{ row }">{{ statusText(row.status) }}</template>
            </el-table-column>
            <el-table-column prop="created_at" label="时间" min-width="180">
              <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="240">
              <template #default="{ row }">
                <el-button v-if="row.status === 'pending'" link @click="handleOrder(row.id, 'accept')">接单</el-button>
                <el-button v-if="row.status === 'pending'" link type="danger" @click="handleOrder(row.id, 'reject')">拒绝</el-button>
                <el-button v-if="row.status === 'accepted'" link type="success" @click="handleOrder(row.id, 'complete')">完成</el-button>
                <el-button v-if="['pending', 'accepted'].includes(row.status)" link type="warning" @click="handleOrder(row.id, 'cancel')">取消</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <el-pagination
          v-model:current-page="page"
          class="pagination"
          background
          layout="prev, pager, next, total"
          :page-size="20"
          :total="total"
          @current-change="loadAll"
        />
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="categoryDialog.visible" title="分类信息" width="420px">
      <el-form :model="categoryDialog.form" label-position="top">
        <el-form-item label="名称">
          <el-input v-model="categoryDialog.form.name" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="categoryDialog.form.sort_order" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="categoryDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveCategory">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="dishDialog.visible" title="菜品信息" width="620px">
      <el-form :model="dishDialog.form" label-position="top">
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
      <template #footer>
        <el-button @click="dishDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="saveDish">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.admin-page {
  display: grid;
  gap: 24px;
}

.admin-header,
.tabs-shell {
  padding: 24px;
}

.admin-header,
.section-head,
.filters,
.admin-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.hero-tag {
  color: var(--brand);
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

.table-wrap {
  border-radius: 18px;
}

.stat-card {
  display: grid;
  gap: 10px;
  padding: 24px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.56);
}

.stat-card strong {
  font-size: 36px;
}

.filters,
.pagination {
  margin: 12px 0 18px;
}

.filters > * {
  min-width: 0;
}

@media (max-width: 900px) {
  .tabs-shell {
    padding: 16px;
  }

  .admin-actions {
    width: 100%;
    justify-content: space-between;
  }

  .table-wrap :deep(.el-table) {
    min-width: 640px;
  }

  .pagination {
    overflow-x: auto;
  }
}

@media (max-width: 900px) {
  .admin-header,
  .section-head,
  .filters {
    flex-direction: column;
    align-items: stretch;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .admin-page {
    gap: 16px;
  }

  .admin-header {
    padding: 18px 16px;
  }

  .filters {
    gap: 10px;
  }
}
</style>
