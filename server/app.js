import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import dishRoutes from "./routes/dishes.js";
import orderRoutes from "./routes/orders.js";
import adminRoutes from "./routes/admin.js";
import { authMiddleware } from "./middleware/auth.js";
import { initDatabase } from "./database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.resolve(__dirname, "uploads")));

app.get("/api/health", (_req, res) => {
  res.json({ code: 0, message: "success", data: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/dishes", dishRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", authMiddleware, adminRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ code: 1001, message: "服务器内部错误", data: null });
});

initDatabase()
  .then(() => {
    app.listen(port, host, () => {
      console.log(`server running at http://${host}:${port}`);
    });
  })
  .catch((error) => {
    console.error("database init failed", error);
    process.exit(1);
  });
