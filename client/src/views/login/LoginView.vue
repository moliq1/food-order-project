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
    <div class="page-shell login-shell">
      <section class="glass-card login-card">
        <div class="login-copy">
          <span class="status-chip warning">店员入口</span>
          <h1 class="page-title">餐饮管理登录</h1>
          <p class="page-subtitle">登录后可以进入商家后台和接单工作台，已预置默认账号。</p>
        </div>

        <el-form :model="form" label-position="top" class="compact-form" @submit.prevent="submit">
          <el-form-item label="用户名">
            <el-input v-model="form.username" placeholder="请输入用户名" />
          </el-form-item>
          <el-form-item label="密码">
            <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" />
          </el-form-item>
          <el-button type="primary" class="submit" :loading="loading.value" @click="submit">登录后台</el-button>
        </el-form>

        <div class="quick-links">
          <router-link to="/customer">前往顾客点餐</router-link>
          <router-link to="/merchant">前往接单工作台</router-link>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
}

.login-shell {
  display: flex;
  align-items: center;
}

.login-card {
  width: 100%;
  padding: 18px;
  display: grid;
  gap: 18px;
}

.login-copy {
  display: grid;
  gap: 12px;
}

.submit {
  width: 100%;
}

.quick-links {
  display: grid;
  gap: 12px;
  text-align: center;
  color: var(--soft);
  font-size: 14px;
}
</style>
