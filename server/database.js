import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const databasePath =
  process.env.DATABASE_PATH || path.resolve(__dirname, "../database/food_order.db");
const databaseDir = path.dirname(databasePath);

sqlite3.verbose();

fs.mkdirSync(databaseDir, { recursive: true });

export const db = new sqlite3.Database(databasePath);

export function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

export function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(row);
    });
  });
}

export function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(rows);
    });
  });
}

async function seedAdmin() {
  const admin = await get("SELECT id FROM admins WHERE username = ?", ["admin"]);
  if (!admin) {
    const password = await bcrypt.hash("admin123", 10);
    await run(
      "INSERT INTO admins (username, password, created_at) VALUES (?, ?, datetime('now'))",
      ["admin", password]
    );
  }
}

async function seedMenu() {
  const count = await get("SELECT COUNT(*) AS count FROM categories");
  if (count?.count > 0) {
    return;
  }

  const categories = ["招牌菜", "热菜", "饮品"];
  for (let index = 0; index < categories.length; index += 1) {
    await run(
      "INSERT INTO categories (name, sort_order, created_at) VALUES (?, ?, datetime('now'))",
      [categories[index], index + 1]
    );
  }

  const categoryMap = await all("SELECT id, name FROM categories ORDER BY sort_order ASC");
  const byName = Object.fromEntries(categoryMap.map((item) => [item.name, item.id]));
  const dishes = [
    ["黑椒牛柳饭", 28, "现炒牛柳搭配时蔬", byName["招牌菜"], "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80"],
    ["宫保鸡丁", 24, "经典下饭菜，微辣", byName["热菜"], "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=800&q=80"],
    ["柠檬冰茶", 8, "清爽解腻", byName["饮品"], "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=800&q=80"]
  ];

  for (const dish of dishes) {
    await run(
      `INSERT INTO dishes
        (name, price, description, category_id, image_url, is_available, created_at)
       VALUES (?, ?, ?, ?, ?, 1, datetime('now'))`,
      dish
    );
  }
}

export async function initDatabase() {
  await run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS dishes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL CHECK(price >= 0),
      description TEXT,
      category_id INTEGER,
      image_url TEXT,
      is_available INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      status TEXT NOT NULL,
      total_amount REAL NOT NULL,
      remark TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      dish_id INTEGER,
      dish_name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (dish_id) REFERENCES dishes(id)
    )
  `);

  await run("CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no)");
  await run("CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)");
  await run("CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)");

  await seedAdmin();
  await seedMenu();
}
