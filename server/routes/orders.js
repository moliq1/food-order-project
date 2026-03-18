import express from "express";
import { body, query, validationResult } from "express-validator";
import { all, get, run } from "../database.js";
import { generateOrderNo } from "../utils/orderNo.js";

const router = express.Router();

function errorResponse(res, status, message, data = null) {
  return res.status(status).json({ code: 1001, message, data });
}

function withinFiveMinutes(createdAt) {
  return Date.now() - new Date(createdAt).getTime() <= 5 * 60 * 1000;
}

router.post(
  "/",
  [
    body("customer_name").trim().notEmpty(),
    body("customer_phone").trim().isLength({ min: 6 }),
    body("items").isArray({ min: 1 }),
    body("items.*.dish_id").isInt({ min: 1 }),
    body("items.*.quantity").isInt({ min: 1 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, "参数错误", errors.array());
    }

    const { customer_name, customer_phone, items, remark = "" } = req.body;
    const dishIds = items.map((item) => item.dish_id);
    const dishes = await all(
      `SELECT id, name, price, is_available
       FROM dishes
       WHERE id IN (${dishIds.map(() => "?").join(",")})`,
      dishIds
    );

    if (dishes.length !== dishIds.length) {
      return errorResponse(res, 400, "部分菜品不存在");
    }

    const dishMap = new Map(dishes.map((item) => [item.id, item]));
    let totalAmount = 0;

    for (const item of items) {
      const dish = dishMap.get(item.dish_id);
      if (!dish?.is_available) {
        return errorResponse(res, 400, `菜品 ${dish?.name || item.dish_id} 已下架`);
      }
      totalAmount += dish.price * item.quantity;
    }

    const createdAt = new Date().toISOString();
    const orderNo = generateOrderNo();
    const order = await run(
      `INSERT INTO orders
        (order_no, customer_name, customer_phone, status, total_amount, remark, created_at, updated_at)
       VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)`,
      [orderNo, customer_name, customer_phone, Number(totalAmount.toFixed(2)), remark, createdAt, createdAt]
    );

    for (const item of items) {
      const dish = dishMap.get(item.dish_id);
      await run(
        `INSERT INTO order_items
          (order_id, dish_id, dish_name, price, quantity)
         VALUES (?, ?, ?, ?, ?)`,
        [order.id, dish.id, dish.name, dish.price, item.quantity]
      );
    }

    return res.json({
      code: 0,
      message: "success",
      data: {
        id: order.id,
        order_no: orderNo,
        total_amount: Number(totalAmount.toFixed(2)),
        status: "pending",
        created_at: createdAt
      }
    });
  }
);

router.get(
  "/",
  [
    query("customer_name").optional().trim(),
    query("phone").optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, "参数错误", errors.array());
    }

    const { customer_name, phone } = req.query;
    if (!customer_name && !phone) {
      return errorResponse(res, 400, "姓名和手机号至少填写一项");
    }

    const clauses = [];
    const params = [];

    if (customer_name) {
      clauses.push("customer_name = ?");
      params.push(customer_name);
    }
    if (phone) {
      clauses.push("customer_phone LIKE ?");
      params.push(`%${String(phone)}`);
    }

    const orders = await all(
      `SELECT *
       FROM orders
       WHERE ${clauses.join(" AND ")}
       ORDER BY datetime(created_at) DESC
       LIMIT 20`,
      params
    );

    if (!orders.length) {
      return errorResponse(res, 404, "未找到订单");
    }

    const orderIds = orders.map((item) => item.id);
    const items = await all(
      `SELECT *
       FROM order_items
       WHERE order_id IN (${orderIds.map(() => "?").join(",")})
       ORDER BY id ASC`,
      orderIds
    );
    const itemMap = new Map();
    for (const item of items) {
      const bucket = itemMap.get(item.order_id) || [];
      bucket.push(item);
      itemMap.set(item.order_id, bucket);
    }

    return res.json({
      code: 0,
      message: "success",
      data: orders.map((order) => ({ ...order, items: itemMap.get(order.id) || [] }))
    });
  }
);

router.get("/:id", async (req, res) => {
  const order = await get("SELECT * FROM orders WHERE id = ?", [req.params.id]);
  if (!order) {
    return errorResponse(res, 404, "订单不存在");
  }

  const items = await all("SELECT * FROM order_items WHERE order_id = ?", [req.params.id]);
  return res.json({ code: 0, message: "success", data: { ...order, items } });
});

router.post("/:id/cancel", async (req, res) => {
  const order = await get("SELECT * FROM orders WHERE id = ?", [req.params.id]);
  if (!order) {
    return errorResponse(res, 404, "订单不存在");
  }
  if (order.status !== "pending") {
    return errorResponse(res, 400, "当前状态不可取消");
  }
  if (!withinFiveMinutes(order.created_at)) {
    return errorResponse(res, 400, "订单已超过可取消时间");
  }

  await run("UPDATE orders SET status = 'cancelled', updated_at = ? WHERE id = ?", [
    new Date().toISOString(),
    req.params.id
  ]);

  return res.json({ code: 0, message: "success", data: true });
});

export default router;
