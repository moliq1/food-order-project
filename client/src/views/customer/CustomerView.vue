<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { dishApi, orderApi } from "../../api";
import { useCartStore } from "../../stores/cart";
import { formatCurrency, formatTime, statusText } from "../../utils/format";
import { getDishImageUrl, handleDishImageError } from "../../utils/media";

const cartStore = useCartStore();
const categories = ref([]);
const activeCategory = ref(null);
const cartSheetVisible = ref(false);
const checkoutSheetVisible = ref(false);
const orderEntryVisible = ref(false);
const activeSection = ref("menu");
const orderFormRef = ref(null);
const storeHeroRef = ref(null);
const categoryScrollRef = ref(null);
const categoryStripRef = ref(null);
const categoryPlaceholderHeight = ref(0);
const isCategoryPinned = ref(false);
const categorySections = new Map();
const categoryItems = new Map();
const orderResults = ref([]);
const previewVisible = ref(false);
const previewImageUrl = ref("");
const previewImageAlt = ref("");
const previewScale = ref(1);
const previewOffset = reactive({ x: 0, y: 0 });
const orderQuery = reactive({ customer_name: "", phone: "" });
const orderForm = reactive({ customer_name: "", customer_phone: "", remark: "" });
let pinchStartDistance = 0;
let pinchStartScale = 1;
let dragStartX = 0;
let dragStartY = 0;
let dragOriginX = 0;
let dragOriginY = 0;
let observer;

const cartItems = computed(() => cartStore.items);
const canCheckout = computed(() => cartStore.canCheckout);

const orderRules = {
  customer_name: [{ required: true, message: "请输入姓名", trigger: "blur" }],
  customer_phone: [{ required: true, message: "请输入电话", trigger: "blur" }]
};

function setCategorySection(id, element) {
  const target = element?.$el ?? element;
  if (target) {
    categorySections.set(id, target);
    if (observer) {
      observer.observe(target);
    }
  } else {
    categorySections.delete(id);
  }
}

function setCategoryItem(id, element) {
  const target = element?.$el ?? element;
  if (target) {
    categoryItems.set(id, target);
  } else {
    categoryItems.delete(id);
  }
}

function setupCategoryObserver() {
  observer?.disconnect();
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
      rootMargin: "-108px 0px -60% 0px",
      threshold: [0.2, 0.45, 0.75]
    }
  );

  categorySections.forEach((element) => observer.observe(element));
}

async function loadMenu() {
  const response = await dishApi.list();
  categories.value = response.data;
  activeCategory.value = response.data[0]?.id || null;
  await nextTick();
  updateCategoryStripMetrics();
  setupCategoryObserver();
}

function syncActiveCategoryIntoView() {
  const container = categoryScrollRef.value;
  const activeItem = categoryItems.get(activeCategory.value);
  if (!container || !activeItem) {
    return;
  }

  const targetLeft = activeItem.offsetLeft - (container.clientWidth - activeItem.clientWidth) / 2;
  const maxScrollLeft = container.scrollWidth - container.clientWidth;
  container.scrollTo({
    left: Math.max(0, Math.min(targetLeft, maxScrollLeft)),
    behavior: "smooth"
  });
}

function scrollToCategory(id) {
  activeCategory.value = id;
  activeSection.value = "menu";
  const target = categorySections.get(id);
  if (!target) {
    return;
  }

  const top = window.scrollY + target.getBoundingClientRect().top - 92;
  window.scrollTo({
    top: Math.max(top, 0),
    behavior: "smooth"
  });
}

function updateCategoryStripMetrics() {
  categoryPlaceholderHeight.value = categoryStripRef.value?.offsetHeight || 0;
}

function updateCategoryPinnedState() {
  const hero = storeHeroRef.value;
  const strip = categoryStripRef.value;
  if (!strip || !hero) {
    return;
  }

  const pinnedTop = 8;
  const heroBottom = hero.getBoundingClientRect().bottom;
  const stripTop = strip.getBoundingClientRect().top;
  isCategoryPinned.value = stripTop <= pinnedTop && heroBottom <= pinnedTop;
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function openImagePreview(dish) {
  previewImageUrl.value = getDishImageUrl(dish);
  previewImageAlt.value = dish.name;
  previewScale.value = 1;
  previewOffset.x = 0;
  previewOffset.y = 0;
  previewVisible.value = true;
  document.body.style.overflow = "hidden";
}

function closeImagePreview() {
  previewVisible.value = false;
  previewScale.value = 1;
  previewOffset.x = 0;
  previewOffset.y = 0;
  pinchStartDistance = 0;
  pinchStartScale = 1;
  dragStartX = 0;
  dragStartY = 0;
  dragOriginX = 0;
  dragOriginY = 0;
  document.body.style.overflow = "";
}

function getTouchDistance(touches) {
  if (touches.length < 2) {
    return 0;
  }
  const [firstTouch, secondTouch] = touches;
  const deltaX = secondTouch.clientX - firstTouch.clientX;
  const deltaY = secondTouch.clientY - firstTouch.clientY;
  return Math.hypot(deltaX, deltaY);
}

function handlePreviewTouchStart(event) {
  if (event.touches.length === 2) {
    pinchStartDistance = getTouchDistance(event.touches);
    pinchStartScale = previewScale.value;
    dragOriginX = previewOffset.x;
    dragOriginY = previewOffset.y;
    return;
  }
  if (event.touches.length === 1 && previewScale.value > 1) {
    dragStartX = event.touches[0].clientX;
    dragStartY = event.touches[0].clientY;
    dragOriginX = previewOffset.x;
    dragOriginY = previewOffset.y;
  }
}

function handlePreviewTouchMove(event) {
  if (event.touches.length !== 2 || !pinchStartDistance) {
    if (event.touches.length === 1 && previewScale.value > 1) {
      event.preventDefault();
      const touch = event.touches[0];
      previewOffset.x = dragOriginX + touch.clientX - dragStartX;
      previewOffset.y = dragOriginY + touch.clientY - dragStartY;
    }
    return;
  }
  event.preventDefault();
  const nextDistance = getTouchDistance(event.touches);
  const nextScale = pinchStartScale * (nextDistance / pinchStartDistance);
  previewScale.value = Math.min(4, Math.max(1, nextScale));
}

function handlePreviewTouchEnd() {
  if (previewScale.value < 1) {
    previewScale.value = 1;
  }
  if (previewScale.value > 4) {
    previewScale.value = 4;
  }
  if (pinchStartDistance && previewScale.value === 1) {
    pinchStartDistance = 0;
    pinchStartScale = 1;
  }
  if (previewScale.value === 1) {
    previewOffset.x = 0;
    previewOffset.y = 0;
  }
  if (pinchStartDistance && previewScale.value > 1) {
    pinchStartDistance = 0;
    pinchStartScale = previewScale.value;
  }
}

function handlePreviewImageTap() {
  if (previewScale.value > 1) {
    previewScale.value = 1;
    previewOffset.x = 0;
    previewOffset.y = 0;
    pinchStartDistance = 0;
    pinchStartScale = 1;
    return;
  }
  closeImagePreview();
}

function changeQuantity(item, delta) {
  cartStore.updateQuantity(item.id, item.quantity + delta);
}

function addDish(dish) {
  cartStore.addDish(dish);
  ElMessage.success(`已加入 ${dish.name}`);
}

function openCheckout() {
  if (!canCheckout.value) {
    ElMessage.warning("请先选择菜品");
    return;
  }
  cartSheetVisible.value = false;
  checkoutSheetVisible.value = true;
}

async function fetchOrderDetail(id) {
  const detail = await orderApi.detail(id);
  return detail.data;
}

async function submitOrder() {
  if (!canCheckout.value) {
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
  checkoutSheetVisible.value = false;
  orderEntryVisible.value = true;
  activeSection.value = "orders";
  orderQuery.customer_name = orderForm.customer_name;
  orderQuery.phone = orderForm.customer_phone.slice(-4);
  ElMessage.success("下单成功，可在订单入口查看最新状态");
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

onMounted(async () => {
  await loadMenu();
  updateCategoryPinnedState();
  window.addEventListener("scroll", updateCategoryPinnedState, { passive: true });
  window.addEventListener("resize", updateCategoryStripMetrics, { passive: true });
  window.addEventListener("resize", updateCategoryPinnedState, { passive: true });
});

onBeforeUnmount(() => {
  observer?.disconnect();
  window.removeEventListener("scroll", updateCategoryPinnedState);
  window.removeEventListener("resize", updateCategoryStripMetrics);
  window.removeEventListener("resize", updateCategoryPinnedState);
  document.body.style.overflow = "";
});

watch(activeCategory, () => {
  nextTick(syncActiveCategoryIntoView);
});
</script>

<template>
  <div class="page-shell customer-page">
    <section ref="storeHeroRef" class="store-hero glass-card">
      <div class="store-topline">
        <span class="status-chip success">营业中</span>
        <button class="order-entry" type="button" @click="orderEntryVisible = true">订单</button>
      </div>
      <div class="store-title">
        <h1 class="page-title">今日点餐</h1>
        <p class="page-subtitle">现做现出，先选菜再一键下单，默认按手机单手操作体验优化。</p>
      </div>
      <div class="store-summary">
        <div class="summary-card">
          <span>取餐方式</span>
          <strong>到店自取</strong>
        </div>
        <div class="summary-card">
          <span>今日推荐</span>
          <strong>{{ categories[0]?.dishes?.[0]?.name || "招牌热菜" }}</strong>
        </div>
        <div class="summary-card">
          <span>购物车</span>
          <strong>{{ cartStore.totalCount }} 件</strong>
        </div>
      </div>
    </section>

    <div v-if="isCategoryPinned" class="category-strip-placeholder" :style="{ height: `${categoryPlaceholderHeight}px` }"></div>

    <section ref="categoryStripRef" class="category-strip" :class="{ 'is-pinned': isCategoryPinned }">
      <div ref="categoryScrollRef" class="mobile-scroll category-scroll">
        <button
          v-for="category in categories"
          :key="category.id"
          :ref="(element) => setCategoryItem(category.id, element)"
          class="category-chip"
          :class="{ active: activeCategory === category.id }"
          type="button"
          @click="scrollToCategory(category.id)"
        >
          {{ category.name }}
        </button>
      </div>
    </section>

    <main class="menu-list">
      <section
        v-for="category in categories"
        :key="category.id"
        :ref="(element) => setCategorySection(category.id, element)"
        :data-category-id="category.id"
        class="menu-section"
      >
        <div class="menu-section-head">
          <div>
            <h2 class="section-title">{{ category.name }}</h2>
            <p>{{ category.dishes.length }} 道菜</p>
          </div>
        </div>

        <article v-for="dish in category.dishes" :key="dish.id" class="dish-card glass-card">
          <button class="dish-image-trigger" type="button" @click="openImagePreview(dish)">
            <img :src="getDishImageUrl(dish)" :alt="dish.name" @error="(event) => handleDishImageError(event, dish.name)" />
          </button>
          <div class="dish-copy">
            <div class="dish-copy-top">
              <div>
                <h3>{{ dish.name }}</h3>
                <p>{{ dish.description || "现做现出品，推荐趁热享用" }}</p>
              </div>
              <span class="status-chip muted">{{ category.name }}</span>
            </div>
            <div class="dish-bottom">
              <strong>{{ formatCurrency(dish.price) }}</strong>
              <el-button type="primary" @click="addDish(dish)">加入</el-button>
            </div>
          </div>
        </article>
      </section>
    </main>

    <div class="page-bottom-actions">
      <button class="back-to-top-link" type="button" @click="scrollToTop">回到顶部</button>
    </div>

    <teleport to="body">
      <div v-if="previewVisible" class="image-preview" @click.self="closeImagePreview">
        <button class="image-preview-close" type="button" @click="closeImagePreview">关闭</button>
        <div
          class="image-preview-stage"
          @touchstart="handlePreviewTouchStart"
          @touchmove="handlePreviewTouchMove"
          @touchend="handlePreviewTouchEnd"
          @touchcancel="handlePreviewTouchEnd"
        >
          <img
            class="image-preview-photo"
            :src="previewImageUrl"
            :alt="previewImageAlt"
            :style="{ transform: `translate(${previewOffset.x}px, ${previewOffset.y}px) scale(${previewScale})` }"
            @click.stop="handlePreviewImageTap"
          />
        </div>
        <p class="image-preview-tip">支持双指放大缩小</p>
      </div>
    </teleport>

    <div class="action-bar customer-action-bar">
      <div class="action-bar-inner">
        <button class="action-bar-copy" type="button" @click="cartSheetVisible = true">
          <strong>{{ formatCurrency(cartStore.totalAmount) }}</strong>
          <span>{{ cartStore.totalCount ? `${cartStore.totalCount} 件商品，点击查看购物车` : "先加入几道喜欢的菜品" }}</span>
        </button>
        <el-button class="action-bar-primary" type="primary" :disabled="!canCheckout" @click="openCheckout">
          去结算
        </el-button>
      </div>
    </div>

    <el-drawer v-model="cartSheetVisible" direction="btt" size="70%" :with-header="false" class="mobile-sheet">
      <div class="app-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-title">
          <strong>购物车</strong>
          <el-button link @click="cartStore.clear()">清空</el-button>
        </div>
        <div v-if="cartItems.length" class="card-list">
          <div v-for="item in cartItems" :key="item.id" class="cart-card glass-card">
            <div class="cart-card-main">
              <strong>{{ item.name }}</strong>
              <span>{{ formatCurrency(item.price) }}</span>
            </div>
            <div class="stepper">
              <button type="button" @click="changeQuantity(item, -1)">-</button>
              <span>{{ item.quantity }}</span>
              <button type="button" @click="changeQuantity(item, 1)">+</button>
            </div>
          </div>
        </div>
        <el-empty v-else description="还没有选择菜品" />
        <div class="sheet-total">
          <strong>合计 {{ formatCurrency(cartStore.totalAmount) }}</strong>
          <el-button type="primary" :disabled="!canCheckout" @click="openCheckout">填写信息</el-button>
        </div>
      </div>
    </el-drawer>

    <el-drawer
      v-model="checkoutSheetVisible"
      direction="btt"
      size="88%"
      :with-header="false"
      class="mobile-sheet"
    >
      <div class="app-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-title">
          <strong>确认订单</strong>
          <span>{{ cartStore.totalCount }} 件</span>
        </div>
        <el-form ref="orderFormRef" :model="orderForm" :rules="orderRules" label-position="top" class="compact-form">
          <el-form-item label="姓名" prop="customer_name">
            <el-input v-model="orderForm.customer_name" placeholder="请输入姓名" />
          </el-form-item>
          <el-form-item label="电话" prop="customer_phone">
            <el-input v-model="orderForm.customer_phone" placeholder="请输入联系电话" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="orderForm.remark" type="textarea" :rows="3" placeholder="例如少辣、打包、到店时间" />
          </el-form-item>
        </el-form>
        <div class="checkout-items glass-card">
          <div v-for="item in cartItems" :key="item.id" class="checkout-item">
            <span>{{ item.name }} x {{ item.quantity }}</span>
            <strong>{{ formatCurrency(item.quantity * item.price) }}</strong>
          </div>
        </div>
        <div class="sheet-total">
          <strong>应付 {{ formatCurrency(cartStore.totalAmount) }}</strong>
          <el-button type="primary" @click="submitOrder">提交订单</el-button>
        </div>
      </div>
    </el-drawer>

    <el-drawer v-model="orderEntryVisible" direction="btt" size="88%" :with-header="false" class="mobile-sheet">
      <div class="app-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-title">
          <strong>订单查询</strong>
          <span>{{ orderResults.length ? `${orderResults.length} 条结果` : "输入信息后查询" }}</span>
        </div>
        <div class="compact-form order-search-form">
          <el-input v-model="orderQuery.customer_name" clearable placeholder="姓名，可选" />
          <el-input v-model="orderQuery.phone" clearable placeholder="手机号后 4 位，可选" />
          <el-button type="primary" @click="searchOrder">查询订单</el-button>
        </div>

        <div v-if="orderResults.length" class="card-list">
          <article v-for="order in orderResults" :key="order.id" class="order-card glass-card">
            <div class="order-card-head">
              <div>
                <strong>{{ order.order_no }}</strong>
                <p>{{ formatTime(order.created_at) }}</p>
              </div>
              <span class="status-chip" :class="order.status === 'pending' ? 'warning' : 'success'">
                {{ statusText(order.status) }}
              </span>
            </div>
            <div class="order-card-items">
              <div v-for="item in order.items" :key="item.id">{{ item.dish_name }} x {{ item.quantity }}</div>
            </div>
            <div class="order-card-foot">
              <strong>{{ formatCurrency(order.total_amount) }}</strong>
              <el-button v-if="order.status === 'pending'" type="danger" plain @click="cancelOrder(order)">取消订单</el-button>
            </div>
          </article>
        </div>
        <el-empty v-else description="还没有订单记录，支持用姓名或手机号后 4 位查询" />
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.customer-page {
  display: grid;
  gap: 14px;
  min-width: 0;
  padding-bottom: 120px;
}

.store-hero {
  padding: 16px;
  display: grid;
  gap: 14px;
}

.store-topline,
.menu-section-head,
.dish-bottom,
.sheet-total,
.order-card-head,
.order-card-foot,
.checkout-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.order-entry {
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--surface-soft);
  color: var(--brand-deep);
  font-weight: 700;
}

.store-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  min-width: 0;
}

.summary-card {
  min-width: 0;
  padding: 12px;
  border-radius: var(--radius-md);
  background: var(--surface-soft);
  display: grid;
  gap: 6px;
}

.summary-card span,
.menu-section-head p,
.dish-copy p,
.cart-card-main span,
.order-card-head p {
  margin: 0;
  color: var(--soft);
  font-size: 12px;
  line-height: 1.5;
}

.category-strip {
  position: relative;
  z-index: 24;
  padding: 6px 0;
  min-width: 0;
}

.category-strip.is-pinned {
  position: fixed;
  top: 8px;
  left: 50%;
  width: calc(100% - 32px);
  max-width: calc(var(--app-max) - 32px);
  transform: translateX(-50%);
  z-index: 40;
}

.category-strip-placeholder {
  width: 100%;
}

.category-scroll {
  display: flex;
  gap: 10px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding: 4px;
  border-radius: 999px;
  background: rgba(247, 244, 237, 0.92);
  backdrop-filter: blur(10px);
}

.category-chip {
  flex: 0 0 auto;
  min-height: 38px;
  padding: 0 16px;
  border-radius: 999px;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid var(--line);
  box-shadow: var(--shadow);
  color: var(--soft);
  font-weight: 700;
}

.category-chip.active {
  color: #fff;
  background: var(--brand);
  border-color: var(--brand);
}

.menu-list,
.menu-section {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.menu-section {
  scroll-margin-top: 86px;
}

.dish-card {
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr);
  gap: 12px;
  padding: 12px;
}

.dish-image-trigger {
  width: 104px;
  height: 104px;
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: zoom-in;
}

.dish-image-trigger img {
  width: 104px;
  height: 104px;
  border-radius: var(--radius-md);
  object-fit: cover;
}

.dish-copy,
.dish-copy-top {
  display: grid;
  gap: 10px;
}

.dish-copy {
  min-width: 0;
}

.dish-copy h3,
.cart-card-main strong {
  margin: 0;
  font-size: 16px;
  line-height: 1.35;
  word-break: break-word;
}

.dish-bottom strong,
.sheet-total strong,
.order-card-foot strong {
  font-size: 18px;
}

.dish-bottom {
  flex-wrap: nowrap;
  min-width: 0;
}

.dish-bottom > * {
  min-width: 0;
}

.dish-bottom strong {
  min-width: 0;
  overflow-wrap: anywhere;
}

.dish-bottom :deep(.el-button) {
  flex-shrink: 0;
  min-width: 0;
}

.customer-action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  max-width: var(--app-max);
  margin: 0 auto;
  padding: 12px 16px calc(10px + env(safe-area-inset-bottom));
}

.page-bottom-actions {
  display: flex;
  justify-content: center;
  padding: 4px 0 12px;
}

.back-to-top-link {
  min-height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  color: var(--brand-deep);
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--line);
  font-size: 13px;
  font-weight: 700;
}

.image-preview {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 16px;
  padding: 16px 16px calc(24px + env(safe-area-inset-bottom));
  background: rgba(15, 14, 12, 0.94);
}

.image-preview-close {
  justify-self: end;
  min-height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-weight: 700;
}

.image-preview-stage {
  display: grid;
  place-items: center;
  overflow: hidden;
  touch-action: none;
}

.image-preview-photo {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transform-origin: center center;
  transition: transform 0.08s linear;
  user-select: none;
  -webkit-user-drag: none;
}

.image-preview-tip {
  margin: 0;
  text-align: center;
  color: rgba(255, 255, 255, 0.72);
  font-size: 13px;
}

.cart-card,
.order-card,
.checkout-items {
  padding: 14px;
  display: grid;
  gap: 12px;
}

.cart-card {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

.stepper {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 6px;
  border-radius: 999px;
  background: var(--surface-soft);
}

.stepper button {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: #fff;
  color: var(--ink);
  font-size: 18px;
  font-weight: 700;
}

.stepper span {
  min-width: 18px;
  text-align: center;
  font-weight: 700;
}

.sheet-total {
  margin-top: 4px;
}

.order-card-items {
  display: grid;
  gap: 8px;
  color: var(--soft);
  font-size: 13px;
}

@media (max-width: 360px) {
  .store-summary {
    grid-template-columns: 1fr;
  }

  .dish-card {
    grid-template-columns: 88px minmax(0, 1fr);
  }

  .dish-image-trigger,
  .dish-image-trigger img {
    width: 88px;
    height: 88px;
  }

  .dish-bottom {
    flex-wrap: wrap;
  }

  .dish-bottom :deep(.el-button) {
    width: 100%;
  }

  .action-bar-inner {
    flex-wrap: wrap;
  }

  .action-bar-primary {
    width: 100%;
    min-width: 0;
  }
}
</style>
