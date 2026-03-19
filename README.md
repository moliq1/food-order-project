# Food Order Project

餐饮在线点菜系统，按设计文档实现了以下能力：

- 用户端：菜单浏览、购物车、下单、订单查询、订单取消
- 商家端：登录、分类/菜品管理、订单管理、数据统计
- 接单端：待处理订单轮询、快速接单/拒单、完成订单
- 后端：Express + SQLite + JWT + 图片上传

## 目录

- `client/` Vue 3 + Vite + Element Plus
- `server/` Express + SQLite
- `database/` SQLite 数据文件

## 启动

1. 在根目录执行 `npm run install:all`
2. 启动后端：`npm run dev:server`
3. 启动前端：`npm run dev:client`

默认后端端口为 `3000`，前端开发端口为 `5173`。

默认管理员账号：

- 用户名：`admin`
- 密码：`admin123`

## Docker 部署

项目支持通过 Docker Compose 一键部署到公网服务器，默认外网访问端口为 `18080`。

### 1. 服务器准备

- 安装 Docker 和 Docker Compose
- 放行服务器安全组/防火墙端口：`18080/tcp`

### 2. 启动服务

在项目根目录执行：

```bash
docker compose up -d --build
```

启动后可通过以下地址访问：

```text
http://服务器公网IP:18080
```

### 3. 端口修改

如需修改外网端口，编辑根目录 `docker-compose.yml` 中的端口映射：

```yaml
ports:
  - "18080:80"
```

例如改成 `28080`：

```yaml
ports:
  - "28080:80"
```

修改后重新启动：

```bash
docker compose up -d --build
```

### 4. 数据持久化

- SQLite 数据库目录：`./database`
- 上传图片目录：`./server/uploads`

以上目录已挂载到容器内，重建容器后数据不会丢失。

### 5. 常用命令

查看容器状态：

```bash
docker compose ps
```

查看日志：

```bash
docker compose logs -f
```

停止服务：

```bash
docker compose down
```
