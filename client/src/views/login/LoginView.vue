<script setup>
import { reactive } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useAuthStore } from "../../stores/auth";

const router = useRouter();
const authStore = useAuthStore();
const form = reactive({ username: "admin", password: "admin123" });
const loading = reactive({ value: false });

async function submit() {
  loading.value = true;
  try {
    await authStore.login(form);
    ElMessage.success("登录成功");
    router.push("/admin");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card glass-card">
      <p class="kicker">Merchant Console</p>
      <h1 class="page-title">餐饮点单后台</h1>
      <p class="page-subtitle">登录后可进入商家后台和接单页面，默认账号已预置。</p>

      <el-form :model="form" label-position="top" @submit.prevent="submit">
        <el-form-item label="用户名">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" />
        </el-form-item>
        <el-button type="primary" class="submit" :loading="loading.value" @click="submit">登录</el-button>
      </el-form>

      <div class="links">
        <router-link to="/customer">前往用户点餐页</router-link>
        <router-link to="/merchant">前往商家接单页</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background:
    radial-gradient(circle at top right, rgba(199, 91, 57, 0.24), transparent 30%),
    radial-gradient(circle at bottom left, rgba(143, 52, 24, 0.18), transparent 24%);
}

.login-card {
  width: min(100%, 480px);
  padding: 32px;
}

.kicker {
  margin: 0 0 10px;
  color: var(--brand);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.submit {
  width: 100%;
  height: 44px;
  margin-top: 8px;
}

.links {
  display: flex;
  justify-content: space-between;
  margin-top: 18px;
  color: var(--soft);
}

@media (max-width: 768px) {
  .login-page {
    align-items: start;
    padding: 18px 14px;
  }

  .login-card {
    width: 100%;
    padding: 22px 18px;
    margin-top: 6vh;
  }

  .links {
    flex-direction: column;
    gap: 10px;
  }
}
</style>
