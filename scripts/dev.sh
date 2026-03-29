#!/bin/sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
CLIENT_DIR="$ROOT_DIR/client"
SERVER_DIR="$ROOT_DIR/server"

SERVER_PID=""
CLIENT_PID=""

cleanup() {
  if [ -n "$CLIENT_PID" ] && kill -0 "$CLIENT_PID" 2>/dev/null; then
    kill "$CLIENT_PID" 2>/dev/null || true
  fi

  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

if [ ! -d "$CLIENT_DIR/node_modules" ] || [ ! -d "$SERVER_DIR/node_modules" ]; then
  echo "依赖未安装，正在执行 npm run install:all ..."
  (cd "$ROOT_DIR" && npm run install:all)
fi

echo "启动后端服务 http://127.0.0.1:3000"
(cd "$SERVER_DIR" && npm run start) &
SERVER_PID=$!

echo "启动前端服务 http://127.0.0.1:5173"
(cd "$CLIENT_DIR" && npm run dev -- --host 0.0.0.0 --port 5173) &
CLIENT_PID=$!

echo ""
echo "开发环境已启动："
echo "  前端: http://127.0.0.1:5173"
echo "  后端: http://127.0.0.1:3000"
echo "按 Ctrl+C 可同时停止前后端。"
echo ""

wait "$SERVER_PID" "$CLIENT_PID"
