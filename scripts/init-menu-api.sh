#!/bin/bash
# 通过 API 初始化菜单数据
# 用法: ./init-menu-api.sh [用户名] [密码]
# 服务地址
BASE_URL="http://211.140.23.69:18080"

# 从参数或环境变量获取登录信息
ADMIN_USER="${1:-admin}"
ADMIN_PASS="${2:-admin123}"

# 分类列表（按顺序）
CATEGORIES=("招牌推荐" "鸡鸭肉类" "鱼虾海鲜" "素菜小炒" "麻辣干锅" "主食汤粥")

# 菜品数据: "名称|分类|价格|描述"
DISHES=(
  "辣子鸡|招牌推荐|42|外酥里嫩，干香麻辣，下饭过瘾。"
  "松鼠桂鱼|招牌推荐|88|整鱼现炸后浇酸甜芡汁，外脆内嫩。"
  "小炒黄牛肉|招牌推荐|48|黄牛肉鲜嫩滑口，搭配小米椒香辣够味。"
  "蒜蓉粉丝蒸虾|招牌推荐|56|蒜香浓郁，虾肉鲜甜，粉丝吸满汤汁。"
  "麻辣香锅|招牌推荐|46|香辣过瘾，食材丰富，锅气十足。"
  "鱼香肉丝|鸡鸭肉类|26|经典川味家常菜，咸鲜微甜，酸辣适口。"
  "辣椒炒肉|鸡鸭肉类|28|鲜椒现炒猪肉片，锅气足，特别下饭。"
  "小酥肉|鸡鸭肉类|32|现炸酥肉外脆里嫩，椒香十足。"
  "锅包肉|鸡鸭肉类|32|外壳酥脆，里脊软嫩，酸甜比例舒服。"
  "糖醋里脊|鸡鸭肉类|30|经典酸甜口，肉条酥嫩，老少皆宜。"
  "可乐鸡翅|鸡鸭肉类|30|甜咸适口，鸡翅软嫩入味，经典不出错。"
  "油炸鸡翅|鸡鸭肉类|28|现炸出锅，外皮香脆，肉质饱满多汁。"
  "蛋黄鸡翅|鸡鸭肉类|36|咸蛋黄裹满鸡翅，沙香浓郁，回味足。"
  "红烧鸡爪煲|鸡鸭肉类|36|鸡爪软糯脱骨，酱香浓郁，越啃越香。"
  "椒盐排骨|鸡鸭肉类|46|外酥里嫩，椒盐香气足，越吃越上头。"
  "金钱蛋|鸡鸭肉类|22|煎蛋搭配辣椒蒜香翻炒，香辣开胃。"
  "干锅鸡翅虾|鱼虾海鲜|58|鸡翅与鲜虾同锅干煸，香辣浓郁。"
  "油焖虾|鱼虾海鲜|52|酱香微甜，鲜虾紧实弹牙，越吃越香。"
  "椒盐虾|鱼虾海鲜|54|虾壳酥香，虾肉紧实，椒盐风味突出。"
  "地三鲜|素菜小炒|24|茄子、土豆、青椒入味软糯，家常必点。"
  "糖醋油条|素菜小炒|18|外酥内软，酸甜开胃，口感很有层次。"
  "蛋黄南瓜|素菜小炒|24|南瓜软糯香甜，裹上咸蛋黄更显浓香。"
  "白菜炖粉条|素菜小炒|22|家常暖胃，汤汁入味，粉条爽滑。"
  "干锅花菜|素菜小炒|24|花菜干香脆爽，带着微辣和锅气。"
  "麻辣烫|麻辣干锅|26|麻辣鲜香，汤底浓郁，暖胃又解馋。"
  "腌笃鲜|主食汤粥|36|鲜香浓汤，咸肉与笋的味道层层释放。"
  "砂锅皮蛋瘦肉粥|主食汤粥|18|现煲砂锅粥，绵密顺口，清淡养胃。"
  "鲫鱼豆腐汤|主食汤粥|32|鱼汤鲜白浓郁，豆腐细嫩，口感温润。"
  "炒方便面|主食汤粥|16|锅气十足，面条劲道，咸香带点烟火气。"
  "炒饭|主食汤粥|14|粒粒分明，咸香耐吃，简单但很满足。"
)

echo "=== 开始初始化菜单 ==="
echo "服务地址: $BASE_URL"
echo "登录用户: $ADMIN_USER"

# 1. 登录获取 token
echo ">>> 登录获取 Token..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${ADMIN_USER}\",\"password\":\"${ADMIN_PASS}\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | sed 's/"token":"//;s/"$//')

if [ -z "$TOKEN" ]; then
  echo "登录失败: $LOGIN_RESPONSE"
  exit 1
fi
echo "登录成功，Token 已获取"

# 通用请求函数
auth_curl() {
  curl -s -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" "$@"
}

# 存储分类ID的关联数组
declare -A CATEGORY_IDS

# 2. 获取现有分类（检查是否已有数据）
echo ">>> 检查现有分类..."
EXISTING_CATS=$(auth_curl "${BASE_URL}/api/admin/categories")
echo "现有分类: $EXISTING_CATS"

# 3. 创建分类
echo ">>> 创建分类..."
for i in "${!CATEGORIES[@]}"; do
  name="${CATEGORIES[$i]}"
  sort_order=$((i + 1))
  response=$(auth_curl -X POST "${BASE_URL}/api/admin/categories" \
    -d "{\"name\":\"${name}\",\"sort_order\":${sort_order}}")
  id=$(echo "$response" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')
  if [ -z "$id" ]; then
    echo "  创建分类失败: $name - $response"
    # 尝试从错误中获取已存在的分类ID
    id=$(auth_curl "${BASE_URL}/api/admin/categories" | grep -o "\"id\":${id}" 2>/dev/null || echo "")
  fi
  CATEGORY_IDS["$name"]=$id
  echo "  分类: $name (ID: $id)"
done

# 4. 创建菜品
echo ">>> 创建菜品..."
for dish in "${DISHES[@]}"; do
  IFS='|' read -r name category price description <<< "$dish"
  category_id="${CATEGORY_IDS[$category]}"
  if [ -z "$category_id" ]; then
    echo "  跳过: $name (找不到分类 $category 的ID)"
    continue
  fi
  response=$(auth_curl -X POST "${BASE_URL}/api/admin/dishes" \
    -d "{\"name\":\"${name}\",\"price\":${price},\"description\":\"${description}\",\"category_id\":${category_id},\"is_available\":1}")
  code=$(echo "$response" | grep -o '"code":[0-9]*' | grep -o '[0-9]*')
  if [ "$code" = "0" ]; then
    echo "  ✓ $name - ¥$price"
  else
    echo "  ✗ $name - $response"
  fi
done

echo "=== 菜单初始化完成 ==="