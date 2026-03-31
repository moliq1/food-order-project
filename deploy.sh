#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_BRANCH="master"
DEFAULT_PORT="18080"

BRANCH="${BRANCH:-$DEFAULT_BRANCH}"
PORT="${PORT:-$DEFAULT_PORT}"

cd "$PROJECT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker 未安装，请先安装 Docker。"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose 不可用，请先安装 Docker Compose。"
  exit 1
fi

echo "==> 项目目录: $PROJECT_DIR"
echo "==> 同步代码分支: $BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "==> 启动 Docker 服务"
docker compose up -d --build

echo "==> 当前容器状态"
docker compose ps

echo "==> 部署完成"
echo "访问地址: http://服务器公网IP:$PORT"
echo "查看日志: docker compose logs -f"
