function makeDishPlaceholder(name = "菜品") {
  const title = encodeURIComponent(name.slice(0, 8) || "菜品");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f8e6d6" />
          <stop offset="100%" stop-color="#f1c6a4" />
        </linearGradient>
      </defs>
      <rect width="240" height="240" rx="36" fill="url(#bg)" />
      <circle cx="120" cy="92" r="42" fill="#ffffff" fill-opacity="0.72" />
      <rect x="62" y="146" width="116" height="20" rx="10" fill="#ffffff" fill-opacity="0.62" />
      <rect x="80" y="176" width="80" height="14" rx="7" fill="#ffffff" fill-opacity="0.48" />
      <text x="120" y="220" text-anchor="middle" font-size="20" font-family="PingFang SC, Microsoft YaHei, sans-serif" fill="#9f4d22">
        ${title}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function getDishImageUrl(dish) {
  if (dish?.image_url) {
    return dish.image_url;
  }
  return makeDishPlaceholder(dish?.name);
}

export function handleDishImageError(event, name) {
  const fallback = makeDishPlaceholder(name);
  if (event?.target && event.target.src !== fallback) {
    event.target.src = fallback;
  }
}
