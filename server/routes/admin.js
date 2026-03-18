import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { body, query, validationResult } from "express-validator";
import { all, get, run } from "../database.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, "../uploads");

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});
const upload = multer({ storage });

function badRequest(res, message, data = null) {
  return res.status(400).json({ code: 1001, message, data });
}

async function updateOrderStatus(id, allowedStatuses, nextStatus) {
  const order = await get("SELECT * FROM orders WHERE id = ?", [id]);
  if (!order) {
    return { error: "订单不存在", status: 404 };
  }
  if (!allowedStatuses.includes(order.status)) {
    return { error: "当前订单状态不允许此操作", status: 400 };
  }
  await run("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?", [
    nextStatus,
    new Date().toISOString(),
    id
  ]);
  return { ok: true };
}

router.get("/categories", async (_req, res) => {
  const categories = await all("SELECT * FROM categories ORDER BY sort_order ASC, id ASC");
  res.json({ code: 0, message: "success", data: categories });
});

router.post("/categories", [body("name").trim().notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequest(res, "参数错误", errors.array());
  }
  const { name, sort_order = 0 } = req.body;
  const result = await run(
    "INSERT INTO categories (name, sort_order, created_at) VALUES (?, ?, datetime('now'))",
    [name, sort_order]
  );
  const category = await get("SELECT * FROM categories WHERE id = ?", [result.id]);
  res.json({ code: 0, message: "success", data: category });
});

router.put("/categories/:id", [body("name").trim().notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequest(res, "参数错误", errors.array());
  }
  const { name, sort_order = 0 } = req.body;
  await run("UPDATE categories SET name = ?, sort_order = ? WHERE id = ?", [name, sort_order, req.params.id]);
  const category = await get("SELECT * FROM categories WHERE id = ?", [req.params.id]);
  res.json({ code: 0, message: "success", data: category });
});

router.delete("/categories/:id", async (req, res) => {
  const count = await get("SELECT COUNT(*) AS count FROM dishes WHERE category_id = ?", [req.params.id]);
  if (count.count > 0) {
    return badRequest(res, "请先删除该分类下的菜品");
  }
  await run("DELETE FROM categories WHERE id = ?", [req.params.id]);
  res.json({ code: 0, message: "success", data: true });
});

router.get("/dishes", async (_req, res) => {
  const dishes = await all(
    `SELECT d.*, c.name AS category_name
     FROM dishes d
     LEFT JOIN categories c ON c.id = d.category_id
     ORDER BY d.id DESC`
  );
  res.json({ code: 0, message: "success", data: dishes });
});

router.post(
  "/dishes",
  [body("name").trim().notEmpty(), body("price").isFloat({ min: 0 }), body("category_id").isInt({ min: 1 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return badRequest(res, "参数错误", errors.array());
    }
    const {
      name,
      price,
      description = "",
      category_id,
      image_url = "",
      is_available = 1
    } = req.body;
    const result = await run(
      `INSERT INTO dishes
        (name, price, description, category_id, image_url, is_available, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [name, price, description, category_id, image_url, is_available ? 1 : 0]
    );
    const dish = await get("SELECT * FROM dishes WHERE id = ?", [result.id]);
    res.json({ code: 0, message: "success", data: dish });
  }
);

router.put(
  "/dishes/:id",
  [body("name").trim().notEmpty(), body("price").isFloat({ min: 0 }), body("category_id").isInt({ min: 1 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return badRequest(res, "参数错误", errors.array());
    }
    const {
      name,
      price,
      description = "",
      category_id,
      image_url = "",
      is_available = 1
    } = req.body;
    await run(
      `UPDATE dishes
       SET name = ?, price = ?, description = ?, category_id = ?, image_url = ?, is_available = ?
       WHERE id = ?`,
      [name, price, description, category_id, image_url, is_available ? 1 : 0, req.params.id]
    );
    const dish = await get("SELECT * FROM dishes WHERE id = ?", [req.params.id]);
    res.json({ code: 0, message: "success", data: dish });
  }
);

router.patch("/dishes/:id/availability", async (req, res) => {
  const dish = await get("SELECT * FROM dishes WHERE id = ?", [req.params.id]);
  if (!dish) {
    return res.status(404).json({ code: 1001, message: "菜品不存在", data: null });
  }
  const next = dish.is_available ? 0 : 1;
  await run("UPDATE dishes SET is_available = ? WHERE id = ?", [next, req.params.id]);
  res.json({ code: 0, message: "success", data: { ...dish, is_available: next } });
});

router.delete("/dishes/:id", async (req, res) => {
  await run("DELETE FROM dishes WHERE id = ?", [req.params.id]);
  res.json({ code: 0, message: "success", data: true });
});

router.get(
  "/orders",
  [query("page").optional().isInt({ min: 1 }), query("limit").optional().isInt({ min: 1, max: 100 })],
  async (req, res) => {
    const { status, start_date, end_date } = req.query;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const offset = (page - 1) * limit;

    const clauses = [];
    const params = [];
    if (status) {
      clauses.push("status = ?");
      params.push(status);
    }
    if (start_date) {
      clauses.push("date(created_at) >= date(?)");
      params.push(start_date);
    }
    if (end_date) {
      clauses.push("date(created_at) <= date(?)");
      params.push(end_date);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const list = await all(
      `SELECT * FROM orders ${where} ORDER BY datetime(created_at) DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const total = await get(`SELECT COUNT(*) AS count FROM orders ${where}`, params);
    res.json({
      code: 0,
      message: "success",
      data: { list, total: total.count, page, limit }
    });
  }
);

router.get("/orders/:id", async (req, res) => {
  const order = await get("SELECT * FROM orders WHERE id = ?", [req.params.id]);
  if (!order) {
    return res.status(404).json({ code: 1001, message: "订单不存在", data: null });
  }
  const items = await all("SELECT * FROM order_items WHERE order_id = ?", [req.params.id]);
  res.json({ code: 0, message: "success", data: { ...order, items } });
});

router.post("/orders/:id/accept", async (req, res) => {
  const result = await updateOrderStatus(req.params.id, ["pending"], "accepted");
  if (result.error) {
    return res.status(result.status).json({ code: 1001, message: result.error, data: null });
  }
  res.json({ code: 0, message: "success", data: true });
});

router.post("/orders/:id/reject", async (req, res) => {
  const result = await updateOrderStatus(req.params.id, ["pending"], "rejected");
  if (result.error) {
    return res.status(result.status).json({ code: 1001, message: result.error, data: null });
  }
  res.json({ code: 0, message: "success", data: true });
});

router.post("/orders/:id/complete", async (req, res) => {
  const result = await updateOrderStatus(req.params.id, ["accepted"], "completed");
  if (result.error) {
    return res.status(result.status).json({ code: 1001, message: result.error, data: null });
  }
  res.json({ code: 0, message: "success", data: true });
});

router.post("/orders/:id/cancel", async (req, res) => {
  const result = await updateOrderStatus(req.params.id, ["pending", "accepted"], "cancelled");
  if (result.error) {
    return res.status(result.status).json({ code: 1001, message: result.error, data: null });
  }
  res.json({ code: 0, message: "success", data: true });
});

router.get("/stats", async (_req, res) => {
  const todayOrders = await get("SELECT COUNT(*) AS count FROM orders WHERE date(created_at) = date('now', 'localtime')");
  const todayRevenue = await get(
    "SELECT COALESCE(SUM(total_amount), 0) AS amount FROM orders WHERE status IN ('accepted', 'completed') AND date(created_at) = date('now', 'localtime')"
  );
  const pendingCount = await get("SELECT COUNT(*) AS count FROM orders WHERE status = 'pending'");

  res.json({
    code: 0,
    message: "success",
    data: {
      today_orders: todayOrders.count,
      today_revenue: Number(todayRevenue.amount || 0),
      pending_count: pendingCount.count
    }
  });
});

router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return badRequest(res, "请选择图片");
  }
  res.json({
    code: 0,
    message: "success",
    data: {
      url: `/uploads/${req.file.filename}`
    }
  });
});

export default router;
