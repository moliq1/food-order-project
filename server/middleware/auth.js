import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "food-order-secret";

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({
      code: 1001,
      message: "未登录或登录已过期",
      data: null
    });
  }

  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({
      code: 1001,
      message: "登录态无效",
      data: null
    });
  }
}
