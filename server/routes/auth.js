import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import { get } from "../database.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "food-order-secret";

router.post(
  "/login",
  [body("username").notEmpty(), body("password").notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ code: 1001, message: "参数错误", data: errors.array() });
    }

    const { username, password } = req.body;
    const admin = await get("SELECT * FROM admins WHERE username = ?", [username]);

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({ code: 1001, message: "用户名或密码错误", data: null });
    }

    const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: "24h" });
    return res.json({
      code: 0,
      message: "success",
      data: {
        token,
        user: { id: admin.id, username: admin.username }
      }
    });
  }
);

router.post("/logout", (_req, res) => {
  res.json({ code: 0, message: "success", data: true });
});

router.get("/profile", authMiddleware, async (req, res) => {
  const admin = await get("SELECT id, username, created_at FROM admins WHERE id = ?", [req.user.id]);
  res.json({ code: 0, message: "success", data: admin });
});

export default router;
