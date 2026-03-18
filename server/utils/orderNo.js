export function generateOrderNo() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const datePart = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join("");
  const random = Math.floor(Math.random() * 90 + 10);
  return `${datePart}${random}`;
}
