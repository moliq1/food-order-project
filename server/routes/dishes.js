import express from "express";
import { all, get } from "../database.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  const rows = await all(
    `SELECT c.id AS category_id, c.name AS category_name, c.sort_order,
            d.id, d.name, d.price, d.description, d.image_url, d.is_available
     FROM categories c
     LEFT JOIN dishes d ON d.category_id = c.id AND d.is_available = 1
     ORDER BY c.sort_order ASC, d.id DESC`
  );

  const grouped = [];
  const bucket = new Map();

  for (const row of rows) {
    if (!bucket.has(row.category_id)) {
      const item = {
        id: row.category_id,
        name: row.category_name,
        sort_order: row.sort_order,
        dishes: []
      };
      bucket.set(row.category_id, item);
      grouped.push(item);
    }
    if (row.id) {
      bucket.get(row.category_id).dishes.push({
        id: row.id,
        name: row.name,
        price: row.price,
        description: row.description,
        image_url: row.image_url,
        is_available: row.is_available
      });
    }
  }

  res.json({ code: 0, message: "success", data: grouped });
});

router.get("/:id", async (req, res) => {
  const dish = await get("SELECT * FROM dishes WHERE id = ? AND is_available = 1", [req.params.id]);
  if (!dish) {
    return res.status(404).json({ code: 1001, message: "菜品不存在", data: null });
  }
  return res.json({ code: 0, message: "success", data: dish });
});

export default router;
