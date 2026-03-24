<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { dishApi, orderApi } from "../../api";
import { useCartStore } from "../../stores/cart";
import { formatCurrency, formatTime, statusText } from "../../utils/format";

const cartStore = useCartStore();
const categories = ref([]);
const orderQuery = reactive({ customer_name: "", phone: "" });
const orderForm = reactive({ customer_name: "", customer_phone: "", remark: "" });
const orderResults = ref([]);
const activeCategory = ref(null);
const checkoutVisible = ref(false);
const mobileCartVisible = ref(false);
const orderFormRef = ref(null);
const categoryScrollRef = ref(null);
const categorySections = new Map();
const categoryItems = new Map();
let observer;

const cartItems = computed(() => cartStore.items);
const orderRules = {
  customer_name: [{ required: true, message: "请输入姓名", trigger: "blur" }],
  customer_phone: [{ required: true, message: "请输入电话", trigger: "blur" }]
};

function setCategorySection(id, element) {
  if (element) {
    categorySections.set(id, element);
    if (observer) {
      observer.observe(element);
    }
  } else {
    categorySections.delete(id);
  }
}

function setCategoryItem(id, element) {
  if (element) {
    categoryItems.set(id, element?.$el ?? element);
  } else {
    categoryItems.delete(id);
  }
}

function setupCategoryObserver() {
  if (observer) {
    observer.disconnect();
  }
  observer = new IntersectionObserver(
    (entries) => {
      const visibleEntry = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

      if (visibleEntry) {
        activeCategory.value = Number(visibleEntry.target.dataset.categoryId);
      }
    },
    {
      rootMargin: "-120px 0px -55% 0px",
      threshold: [0.2, 0.5, 0.8]
    }
  );

  categorySections.forEach((element) => observer.observe(element));
}

function scrollToCategory(id) {
  activeCategory.value = id;
  categorySections.get(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function syncActiveCategoryIntoView() {
  const container = categoryScrollRef.value;
  const activeItem = categoryItems.get(activeCategory.value);
  if (!container || !activeItem) {
    return;
  }

  const targetLeft = activeItem.offsetLeft - (container.clientWidth - activeItem.offsetWidth) / 2;
  const maxScrollLeft = container.scrollWidth - container.clientWidth;
  container.scrollTo({
    left: Math.max(0, Math.min(targetLeft, maxScrollLeft)),
    behavior: "smooth"
  });
}

async function loadMenu() {
  const response = await dishApi.list();
  categories.value = response.data;
  activeCategory.value = response.data[0]?.id || null;
  await nextTick();
  setupCategoryObserver();
}

function addDish(dish) {
  cartStore.addDish(dish);
  ElMessage.success(`已加入 ${dish.name}`);
}

async function submitOrder() {
  if (!cartItems.value.length) {
    ElMessage.warning("请先选择菜品");
    return;
  }
  await orderFormRef.value?.validate();

  const payload = {
    ...orderForm,
    items: cartItems.value.map((item) => ({ dish_id: item.id, quantity: item.quantity }))
  };
  const response = await orderApi.create(payload);
  orderResults.value = [await fetchOrderDetail(response.data.id)];
  cartStore.clear();
  checkoutVisible.value = false;
  mobileCartVisible.value = false;
  orderQuery.customer_name = orderForm.customer_name;
  orderQuery.phone = orderForm.customer_phone.slice(-4);
  ElMessage.success("下单成功，可在下方按姓名和手机号后 4 位查询");
}

function openCheckout() {
  mobileCartVisible.value = false;
  checkoutVisible.value = true;
}

async function fetchOrderDetail(id) {
  const detail = await orderApi.detail(id);
  return detail.data;
}

async function searchOrder() {
  if (!orderQuery.customer_name && !orderQuery.phone) {
    ElMessage.warning("姓名和手机号至少填写一项");
    return;
  }
  const response = await orderApi.search(orderQuery);
  orderResults.value = response.data;
}

async function cancelOrder(order) {
  await orderApi.cancel(order.id);
  orderResults.value = await Promise.all(
    orderResults.value.map((item) => (item.id === order.id ? fetchOrderDetail(order.id) : Promise.resolve(item)))
  );
  ElMessage.success("订单已取消");
}

onMounted(loadMenu);
onBeforeUnmount(() => observer?.disconnect());

watch(activeCategory, () => {
  nextTick(syncActiveCategoryIntoView);
});
</script>

<template>
  <div class="page-shell customer-page">
    <section class="hero glass-card">
      <div class="hero-copy">
        <p class="hero-tag">Taste of Today</p>
        <h1 class="page-title">在线点菜，轻松下单</h1>
        <p class="page-subtitle">
          浏览今日菜单，加入购物车后填写姓名和电话即可下单，并可用姓名和手机号后 4 位查询订单。
        </p>
      </div>
      <div class="hero-panel">
        <div class="hero-summary">
          <div>
            <div class="hero-number">{{ cartStore.totalCount }}</div>
            <div>购物车菜品数</div>
          </div>
          <strong>{{ formatCurrency(cartStore.totalAmount) }}</strong>
        </div>
        <el-button type="primary" round class="hero-submit" @click="openCheckout">立即下单</el-button>
      </div>
    </section>

    <section class="content-grid">
      <aside class="glass-card sidebar">
        <h2 class="section-title">菜单分类</h2>
        <div ref="categoryScrollRef" class="category-scroll">
          <el-menu :default-active="String(activeCategory)" class="category-menu">
            <el-menu-item
              v-for="category in categories"
              :key="category.id"
              :index="String(category.id)"
              :ref="(element) => setCategoryItem(category.id, element)"
              @click="scrollToCategory(category.id)"
            >
              {{ category.name }}
            </el-menu-item>
          </el-menu>
        </div>
      </aside>

      <main class="menu-area">
        <section
          v-for="category in categories"
          :key="category.id"
          :ref="(element) => setCategorySection(category.id, element)"
          :data-category-id="category.id"
          class="glass-card category-card"
        >
          <div class="category-header">
            <h2 class="section-title">{{ category.name }}</h2>
            <span>{{ category.dishes.length }} 道菜</span>
          </div>

          <div class="dish-grid">
            <article v-for="dish in category.dishes" :key="dish.id" class="dish-card">
              <img :src="dish.image_url" :alt="dish.name" />
              <div class="dish-info">
                <h3>{{ dish.name }}</h3>
                <p>{{ dish.description || '现做现出品' }}</p>
                <div class="dish-footer">
                  <strong>{{ formatCurrency(dish.price) }}</strong>
                  <el-button type="primary" plain @click="addDish(dish)">加入购物车</el-button>
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>

      <aside class="glass-card cart-panel">
        <div class="cart-header">
          <h2 class="section-title">购物车</h2>
          <el-button link @click="cartStore.clear()">清空</el-button>
        </div>
        <div v-if="cartItems.length" class="cart-list">
          <div v-for="item in cartItems" :key="item.id" class="cart-item">
            <div>
              <strong>{{ item.name }}</strong>
              <p>{{ formatCurrency(item.price) }}</p>
            </div>
            <el-input-number
              :model-value="item.quantity"
              :min="0"
              size="small"
              @change="(value) => cartStore.updateQuantity(item.id, value)"
            />
          </div>
        </div>
        <el-empty v-else description="还没有选择菜品" />
        <div class="cart-summary">
          <span>合计</span>
          <strong>{{ formatCurrency(cartStore.totalAmount) }}</strong>
        </div>
        <el-button type="primary" size="large" :disabled="!cartItems.length" @click="openCheckout">
          去结算
        </el-button>
      </aside>
    </section>

    <section class="glass-card order-search">
      <div>
        <h2 class="section-title">订单查询</h2>
        <p class="page-subtitle">支持只填姓名、只填手机号后 4 位，或两者一起筛选，显示最近多条订单。</p>
      </div>
      <div class="search-form">
        <el-input v-model="orderQuery.customer_name" clearable placeholder="姓名，可选" />
        <el-input v-model="orderQuery.phone" clearable placeholder="手机号后 4 位，可选" />
        <el-button type="primary" @click="searchOrder">查询</el-button>
      </div>

      <div v-if="orderResults.length" class="order-results">
        <div v-for="order in orderResults" :key="order.id" class="order-card">
          <div class="order-meta">
            <div>
              <strong>订单号</strong>
              <p>{{ order.order_no }}</p>
            </div>
            <div>
              <strong>状态</strong>
              <p>{{ statusText(order.status) }}</p>
            </div>
            <div>
              <strong>下单时间</strong>
              <p>{{ formatTime(order.created_at) }}</p>
            </div>
          </div>
          <div class="order-items">
            <div v-for="item in order.items" :key="item.id">
              {{ item.dish_name }} × {{ item.quantity }} / {{ formatCurrency(item.price) }}
            </div>
          </div>
          <strong>总价：{{ formatCurrency(order.total_amount) }}</strong>
          <el-button v-if="order.status === 'pending'" type="danger" plain @click="cancelOrder(order)">取消订单</el-button>
        </div>
      </div>
      <el-empty v-else description="暂未查询到订单，可输入姓名或手机号后 4 位后查询" />
    </section>

    <el-dialog v-model="checkoutVisible" title="确认下单" width="560px">
      <el-form ref="orderFormRef" :model="orderForm" :rules="orderRules" label-position="top">
        <el-form-item label="姓名" prop="customer_name" required>
          <el-input v-model="orderForm.customer_name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="电话" prop="customer_phone" required>
          <el-input v-model="orderForm.customer_phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="orderForm.remark" type="textarea" :rows="3" placeholder="如少辣、打包等" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="checkoutVisible = false">取消</el-button>
        <el-button type="primary" @click="submitOrder">提交订单</el-button>
      </template>
    </el-dialog>

    <el-drawer
      v-model="mobileCartVisible"
      direction="btt"
      size="72%"
      :with-header="false"
      class="mobile-cart-drawer"
    >
      <div class="mobile-cart-sheet">
        <div class="mobile-sheet-handle"></div>
        <div class="cart-header">
          <h2 class="section-title">购物车预览</h2>
          <el-button link @click="cartStore.clear()">清空</el-button>
        </div>
        <div v-if="cartItems.length" class="cart-list mobile-cart-list">
          <div v-for="item in cartItems" :key="item.id" class="cart-item">
            <div>
              <strong>{{ item.name }}</strong>
              <p>{{ formatCurrency(item.price) }}</p>
            </div>
            <el-input-number
              :model-value="item.quantity"
              :min="0"
              size="small"
              @change="(value) => cartStore.updateQuantity(item.id, value)"
            />
          </div>
        </div>
        <el-empty v-else description="还没有选择菜品" />
        <div class="cart-summary mobile-cart-summary">
          <span>合计</span>
          <strong>{{ formatCurrency(cartStore.totalAmount) }}</strong>
        </div>
        <el-button type="primary" size="large" :disabled="!cartItems.length" @click="openCheckout">去结算</el-button>
      </div>
    </el-drawer>

    <button class="mobile-cart-bar glass-card" type="button" @click="mobileCartVisible = true">
      <div class="mobile-cart-copy">
        <strong>{{ cartStore.totalCount }} 件商品</strong>
        <p>{{ cartItems.length ? "点此预览购物车" : "先加入喜欢的菜品" }}</p>
      </div>
      <div class="mobile-cart-meta">
        <strong>{{ formatCurrency(cartStore.totalAmount) }}</strong>
        <span>查看</span>
      </div>
    </button>
  </div>
</template>

<style scoped>
.customer-page {
  display: grid;
  gap: 24px;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(280px, 0.9fr);
  gap: 20px;
  padding: 28px;
}

.hero-tag {
  color: var(--brand);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

.hero-copy {
  min-width: 0;
}

.hero-panel {
  display: grid;
  align-content: center;
  gap: 12px;
  padding: 20px;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(199, 91, 57, 0.12), rgba(143, 52, 24, 0.18));
}

.hero-summary {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 16px;
}

.hero-number {
  font-size: 58px;
  font-weight: 800;
  line-height: 1;
}

.hero-submit {
  width: 100%;
}

.content-grid {
  display: grid;
  grid-template-columns: 240px 1fr 320px;
  gap: 20px;
  align-items: start;
}

.sidebar,
.cart-panel,
.category-card,
.order-search {
  padding: 20px;
}

.sidebar {
  position: sticky;
  top: 20px;
  z-index: 12;
}

.category-menu {
  border-right: 0;
  background: transparent;
}

.category-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.category-scroll::-webkit-scrollbar {
  display: none;
}

.menu-area {
  display: grid;
  gap: 18px;
}

.category-card {
  scroll-margin-top: 92px;
}

.category-header,
.cart-header,
.cart-summary,
.search-form,
.order-meta,
.dish-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.dish-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.dish-card {
  overflow: hidden;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid var(--line);
}

.dish-card img {
  width: 100%;
  height: 180px;
  object-fit: cover;
}

.dish-info {
  padding: 16px;
}

.dish-info h3 {
  margin: 0;
}

.dish-info p {
  color: var(--soft);
  min-height: 44px;
}

.dish-footer :deep(.el-button) {
  min-width: 112px;
}

.cart-list {
  display: grid;
  gap: 14px;
  margin-bottom: 18px;
}

.cart-item,
.order-card {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.54);
}

.order-search {
  display: grid;
  gap: 20px;
}

.search-form {
  justify-content: flex-start;
}

.search-form > * {
  flex: 1 1 180px;
}

.order-results {
  display: grid;
  gap: 14px;
}

.order-meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}

.mobile-cart-bar {
  display: none;
}

.mobile-cart-sheet {
  display: grid;
  gap: 16px;
  height: 100%;
  padding: 12px 4px 4px;
}

.mobile-sheet-handle {
  width: 52px;
  height: 5px;
  margin: 0 auto;
  border-radius: 999px;
  background: rgba(143, 52, 24, 0.18);
}

.mobile-cart-list {
  align-content: start;
  overflow-y: auto;
  padding-right: 4px;
}

.mobile-cart-summary {
  margin-top: auto;
}

@media (max-width: 1024px) {
  .hero,
  .content-grid {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
  }

  .dish-grid {
    grid-template-columns: 1fr;
  }

  .order-meta {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .customer-page {
    gap: 16px;
    padding-bottom: 92px;
  }

  .hero,
  .sidebar,
  .cart-panel,
  .category-card,
  .order-search {
    padding: 16px;
  }

  .hero {
    gap: 18px;
  }

  .hero-summary {
    align-items: center;
  }

  .hero-number {
    font-size: 44px;
  }

  .sidebar {
    position: sticky;
    top: 10px;
    display: grid;
    gap: 8px;
    padding: 10px 12px 8px;
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(255, 248, 244, 0.94), rgba(255, 255, 255, 0.82));
    box-shadow: 0 10px 26px rgba(143, 52, 24, 0.08);
    backdrop-filter: blur(18px);
  }

  .sidebar::before,
  .sidebar::after {
    content: "";
    position: absolute;
    top: 40px;
    bottom: 8px;
    width: 18px;
    z-index: 2;
    pointer-events: none;
  }

  .sidebar::before {
    left: 0;
    background: linear-gradient(90deg, rgba(255, 248, 244, 0.96), rgba(255, 248, 244, 0));
  }

  .sidebar::after {
    right: 0;
    background: linear-gradient(270deg, rgba(255, 248, 244, 0.96), rgba(255, 248, 244, 0));
  }

  .category-menu {
    display: flex;
    gap: 10px;
    width: max-content;
    padding: 0 6px 2px;
  }

  .sidebar .section-title {
    margin-bottom: 2px;
    font-size: 13px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--soft);
  }

  .category-menu :deep(.el-menu-item) {
    height: 36px;
    line-height: 36px;
    min-width: max-content;
    border-radius: 999px;
    padding: 0 14px;
    font-size: 14px;
    background: rgba(255, 255, 255, 0.78);
    color: var(--text);
    border-bottom: 0;
    box-shadow: inset 0 0 0 1px rgba(143, 52, 24, 0.08);
    transition:
      transform 0.2s ease,
      background-color 0.2s ease,
      color 0.2s ease,
      box-shadow 0.2s ease;
  }

  .category-menu :deep(.el-menu-item.is-active) {
    background: linear-gradient(135deg, rgba(199, 91, 57, 0.18), rgba(237, 164, 83, 0.22));
    color: var(--brand-deep);
    box-shadow:
      inset 0 0 0 1px rgba(199, 91, 57, 0.14),
      0 6px 14px rgba(199, 91, 57, 0.12);
    transform: translateY(-1px);
  }

  .dish-card img {
    height: 168px;
  }

  .dish-info {
    padding: 14px;
  }

  .dish-info p {
    min-height: auto;
    line-height: 1.6;
  }

  .cart-panel {
    display: none;
  }

  .search-form {
    flex-direction: column;
    align-items: stretch;
  }

  .mobile-cart-bar {
    position: fixed;
    left: 14px;
    right: 14px;
    bottom: 12px;
    z-index: 20;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 14px 16px;
    border: 0;
    backdrop-filter: blur(18px);
    text-align: left;
  }

  .mobile-cart-copy p {
    margin: 4px 0 0;
    color: var(--soft);
  }

  .mobile-cart-meta {
    display: grid;
    justify-items: end;
    gap: 4px;
    color: var(--brand-deep);
  }

  .mobile-cart-meta span {
    font-size: 13px;
    color: var(--soft);
  }

  .mobile-cart-drawer :deep(.el-drawer) {
    border-radius: 24px 24px 0 0;
    padding: 0 16px 20px;
  }

  .mobile-cart-drawer :deep(.el-drawer__body) {
    padding: 0;
    overflow: hidden;
  }
}
</style>
