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
