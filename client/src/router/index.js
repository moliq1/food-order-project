import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

const routes = [
  { path: "/", redirect: "/customer" },
  { path: "/customer", component: () => import("../views/customer/CustomerView.vue") },
  { path: "/login", component: () => import("../views/login/LoginView.vue") },
  { path: "/admin", component: () => import("../views/admin/AdminDashboard.vue"), meta: { requiresAuth: true } },
  { path: "/merchant", component: () => import("../views/merchant/MerchantView.vue"), meta: { requiresAuth: true } }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to) => {
  const authStore = useAuthStore();
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return "/login";
  }
  return true;
});

export default router;
