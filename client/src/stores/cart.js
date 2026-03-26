import { defineStore } from "pinia";

const STORAGE_KEY = "food-order-cart";

export const useCartStore = defineStore("cart", {
  state: () => ({
    items: JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
  }),
  getters: {
    totalCount: (state) => state.items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: (state) =>
      state.items.reduce((sum, item) => sum + item.quantity * Number(item.price), 0),
    isEmpty: (state) => !state.items.length,
    canCheckout: (state) => state.items.length > 0
  },
  actions: {
    persist() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
    },
    addDish(dish) {
      const target = this.items.find((item) => item.id === dish.id);
      if (target) {
        target.quantity += 1;
      } else {
        this.items.push({ ...dish, quantity: 1 });
      }
      this.persist();
    },
    updateQuantity(id, quantity) {
      const item = this.items.find((row) => row.id === id);
      if (!item) return;
      if (quantity <= 0) {
        this.items = this.items.filter((row) => row.id !== id);
      } else {
        item.quantity = quantity;
      }
      this.persist();
    },
    clear() {
      this.items = [];
      this.persist();
    }
  }
});
