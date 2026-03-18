import { defineStore } from "pinia";
import { authApi } from "../api";

const TOKEN_KEY = "food-order-token";
const USER_KEY = "food-order-user";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || "",
    user: JSON.parse(localStorage.getItem(USER_KEY) || "null")
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.token)
  },
  actions: {
    async login(payload) {
      const response = await authApi.login(payload);
      this.token = response.data.token;
      this.user = response.data.user;
      localStorage.setItem(TOKEN_KEY, this.token);
      localStorage.setItem(USER_KEY, JSON.stringify(this.user));
    },
    logout() {
      this.token = "";
      this.user = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }
});
