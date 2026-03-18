export function formatCurrency(value) {
  return `¥${Number(value || 0).toFixed(2)}`;
}

export function formatTime(value) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

export function statusText(status) {
  return (
    {
      pending: "待接单",
      accepted: "已接单",
      completed: "已完成",
      cancelled: "已取消",
      rejected: "已拒绝"
    }[status] || status
  );
}
