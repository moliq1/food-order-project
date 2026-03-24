import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { all, db, initDatabase, run } from "../database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const menuFilePath = path.resolve(__dirname, "../../data/菜单.txt");

const categoryOrder = [
  "招牌推荐",
  "鸡鸭肉类",
  "鱼虾海鲜",
  "素菜小炒",
  "麻辣干锅",
  "主食汤粥"
];

const categoryMap = {
  辣子鸡: "招牌推荐",
  松鼠桂鱼: "招牌推荐",
  小炒黄牛肉: "招牌推荐",
  蒜蓉粉丝蒸虾: "招牌推荐",
  麻辣香锅: "招牌推荐",
  鱼香肉丝: "鸡鸭肉类",
  辣椒炒肉: "鸡鸭肉类",
  小酥肉: "鸡鸭肉类",
  锅包肉: "鸡鸭肉类",
  糖醋里脊: "鸡鸭肉类",
  可乐鸡翅: "鸡鸭肉类",
  油炸鸡翅: "鸡鸭肉类",
  蛋黄鸡翅: "鸡鸭肉类",
  红烧鸡爪煲: "鸡鸭肉类",
  椒盐排骨: "鸡鸭肉类",
  金钱蛋: "鸡鸭肉类",
  干锅鸡翅虾: "鱼虾海鲜",
  油焖虾: "鱼虾海鲜",
  椒盐虾: "鱼虾海鲜",
  地三鲜: "素菜小炒",
  糖醋油条: "素菜小炒",
  蛋黄南瓜: "素菜小炒",
  白菜炖粉条: "素菜小炒",
  干锅花菜: "素菜小炒",
  麻辣烫: "麻辣干锅",
  腌笃鲜: "主食汤粥",
  砂锅皮蛋瘦肉粥: "主食汤粥",
  鲫鱼豆腐汤: "主食汤粥",
  炒方便面: "主食汤粥",
  炒饭: "主食汤粥"
};

const dishMeta = {
  辣子鸡: { price: 42, description: "外酥里嫩，干香麻辣，下饭过瘾。" },
  松鼠桂鱼: { price: 88, description: "整鱼现炸后浇酸甜芡汁，外脆内嫩。" },
  金钱蛋: { price: 22, description: "煎蛋搭配辣椒蒜香翻炒，香辣开胃。" },
  鱼香肉丝: { price: 26, description: "经典川味家常菜，咸鲜微甜，酸辣适口。" },
  辣椒炒肉: { price: 28, description: "鲜椒现炒猪肉片，锅气足，特别下饭。" },
  干锅鸡翅虾: { price: 58, description: "鸡翅与鲜虾同锅干煸，香辣浓郁。" },
  地三鲜: { price: 24, description: "茄子、土豆、青椒入味软糯，家常必点。" },
  糖醋油条: { price: 18, description: "外酥内软，酸甜开胃，口感很有层次。" },
  腌笃鲜: { price: 36, description: "鲜香浓汤，咸肉与笋的味道层层释放。" },
  小酥肉: { price: 32, description: "现炸酥肉外脆里嫩，椒香十足。" },
  小炒黄牛肉: { price: 48, description: "黄牛肉鲜嫩滑口，搭配小米椒香辣够味。" },
  蒜蓉粉丝蒸虾: { price: 56, description: "蒜香浓郁，虾肉鲜甜，粉丝吸满汤汁。" },
  油焖虾: { price: 52, description: "酱香微甜，鲜虾紧实弹牙，越吃越香。" },
  麻辣香锅: { price: 46, description: "香辣过瘾，食材丰富，锅气十足。" },
  麻辣烫: { price: 26, description: "麻辣鲜香，汤底浓郁，暖胃又解馋。" },
  锅包肉: { price: 32, description: "外壳酥脆，里脊软嫩，酸甜比例舒服。" },
  糖醋里脊: { price: 30, description: "经典酸甜口，肉条酥嫩，老少皆宜。" },
  可乐鸡翅: { price: 30, description: "甜咸适口，鸡翅软嫩入味，经典不出错。" },
  油炸鸡翅: { price: 28, description: "现炸出锅，外皮香脆，肉质饱满多汁。" },
  蛋黄鸡翅: { price: 36, description: "咸蛋黄裹满鸡翅，沙香浓郁，回味足。" },
  蛋黄南瓜: { price: 24, description: "南瓜软糯香甜，裹上咸蛋黄更显浓香。" },
  白菜炖粉条: { price: 22, description: "家常暖胃，汤汁入味，粉条爽滑。" },
  红烧鸡爪煲: { price: 36, description: "鸡爪软糯脱骨，酱香浓郁，越啃越香。" },
  干锅花菜: { price: 24, description: "花菜干香脆爽，带着微辣和锅气。" },
  椒盐排骨: { price: 46, description: "外酥里嫩，椒盐香气足，越吃越上头。" },
  椒盐虾: { price: 54, description: "虾壳酥香，虾肉紧实，椒盐风味突出。" },
  砂锅皮蛋瘦肉粥: { price: 18, description: "现煲砂锅粥，绵密顺口，清淡养胃。" },
  鲫鱼豆腐汤: { price: 32, description: "鱼汤鲜白浓郁，豆腐细嫩，口感温润。" },
  炒方便面: { price: 16, description: "锅气十足，面条劲道，咸香带点烟火气。" },
  炒饭: { price: 14, description: "粒粒分明，咸香耐吃，简单但很满足。" }
};

async function resetMenuTables() {
  await run("DELETE FROM order_items");
  await run("DELETE FROM dishes");
  await run("DELETE FROM categories");
  await run("DELETE FROM sqlite_sequence WHERE name IN ('dishes', 'categories', 'order_items')");
}

async function createCategories() {
  for (let index = 0; index < categoryOrder.length; index += 1) {
    await run(
      "INSERT INTO categories (name, sort_order, created_at) VALUES (?, ?, datetime('now'))",
      [categoryOrder[index], index + 1]
    );
  }

  const rows = await all("SELECT id, name FROM categories ORDER BY sort_order ASC");
  return Object.fromEntries(rows.map((item) => [item.name, item.id]));
}

async function readMenuItems() {
  const content = await fs.readFile(menuFilePath, "utf8");
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function initMenu() {
  await initDatabase();

  const menuItems = await readMenuItems();
  const uncategorized = menuItems.filter((item) => !categoryMap[item]);

  if (uncategorized.length > 0) {
    throw new Error(`以下菜品还没有配置分类: ${uncategorized.join("、")}`);
  }

  await run("BEGIN TRANSACTION");

  try {
    await resetMenuTables();
    const categoryIds = await createCategories();

    for (const name of menuItems) {
      const categoryName = categoryMap[name];
      const meta = dishMeta[name];
      await run(
        `INSERT INTO dishes
          (name, price, description, category_id, image_url, is_available, created_at)
         VALUES (?, ?, ?, ?, ?, 1, datetime('now'))`,
        [name, meta.price, meta.description, categoryIds[categoryName], ""]
      );
    }

    await run("COMMIT");
    console.log(`菜单初始化完成，共导入 ${menuItems.length} 道菜，分类 ${categoryOrder.length} 个。`);
  } catch (error) {
    await run("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }
}

initMenu().catch((error) => {
  console.error("菜单初始化失败:", error.message);
  db.close();
  process.exitCode = 1;
});
