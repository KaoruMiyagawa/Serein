# Serein
Serein 是一个基于 React、FastAPI 和 MySQL 开发的私密情侣空间，支持情侣绑定、每日打卡、心情记录、纪念日、图片回忆、留言聊天和互动吉祥物。
# Serein

> 沉沦 —— 一个只属于两个人的私密情侣日常空间。

Serein 是一个面向情侣的私人 Web 应用，强调简洁、柔和、无广告和低打扰。它用于记录两个人的日常状态、重要日期、共同回忆和留言。

这是一个真实长期使用的个人项目，不以商业化为目标。

## 项目定位

- 简洁：只保留情侣真正需要的内容
- 私密：通过账号和情侣空间绑定，内容只属于双方
- 温柔：使用留白、圆角、柔和色彩和轻量动画
- 移动优先：主要面向手机使用，同时兼容电脑浏览器

## 当前功能

- 普通账号注册与登录
- JWT 登录状态认证
- 创建情侣空间
- 通过邀请码绑定另一半
- 今日首页
- 每日情侣打卡
- 今日心情记录
- 纪念日和相伴天数
- 回忆时间线
- 文字回忆和图片回忆
- 情侣空间留言
- 聊天自动刷新
- 新留言未读数量提示
- 可点击互动的橘猫吉祥物
- 手机端底部导航
- 基础个人资料和密码修改

## 技术栈

### 前端

- React
- TypeScript
- Vite
- CSS

### 后端

- Python
- FastAPI
- SQLAlchemy
- JWT
- bcrypt 密码哈希

### 数据库与文件

- MySQL
- 本地图片文件存储

## 工作原理

```text
React 前端
    ↓ HTTP 请求 / JSON / FormData
FastAPI 后端
    ↓ SQLAlchemy
MySQL 数据库

图片文件 → backend/uploads/memories/
图片地址 → MySQL memories.image_url
```

前端负责页面、交互和请求；FastAPI 负责登录、权限和业务逻辑；MySQL 保存用户、情侣空间、打卡、留言、纪念日和回忆等数据。

## 项目结构

```text
.
├── backend/
│   ├── main.py          # FastAPI 接口入口
│   ├── models.py        # 数据库模型
│   ├── schemas.py       # 请求和响应数据结构
│   ├── database.py      # 数据库连接
│   ├── auth.py          # JWT 认证
│   ├── security.py      # 密码加密与校验
│   └── uploads/         # 本地上传的回忆图片
├── frontend/
│   └── src/
│       ├── App.tsx      # 页面和主要交互
│       ├── App.css      # 页面样式
│       ├── Pet.tsx      # 橘猫互动组件
│       └── Pet.css
└── README.md
```

## 本地运行

项目当前使用 WSL Ubuntu 开发。

### 启动后端

在第一个 Bash 终端执行：

```bash
cd "/mnt/c/Users/Lenovo/Documents/Codex/2026-09-27/app-apple-apple-ui-1-2/backend"
source .venv/bin/activate
python -m uvicorn main:app --reload --port 8000
```

后端地址：<http://127.0.0.1:8000>

接口文档：<http://127.0.0.1:8000/docs>

### 启动前端

在第二个 Bash 终端执行：

```bash
source /home/lenovokaoru/.nvm/nvm.sh
nvm use 24
cd "/mnt/c/Users/Lenovo/Documents/Codex/2026-09-27/app-apple-apple-ui-1-2/frontend"
npm run dev -- --host 0.0.0.0 --port 5173
```

前端地址：<http://localhost:5173>

## 当前版本说明

这是第一版 MVP，图片目前保存在本地 `backend/uploads/memories` 目录中。聊天目前使用定时刷新同步，不是 WebSocket 真正推送。

微信登录、QQ 登录、实时 WebSocket、云端对象存储、图片压缩、消息通知和正式部署暂未加入。

## 后续计划

1. 图片回忆体验优化
2. 聊天图片、表情和时间显示
3. WebSocket 实时聊天
4. 未读消息和浏览器通知
5. 共享日历和提醒
6. 情侣随机任务
7. 更完善的隐私和数据导出
8. 微信 / QQ 登录

## 这个项目体现的能力

- React 前端组件与状态管理
- TypeScript 类型设计
- 前后端 API 联调
- FastAPI 路由和依赖注入
- JWT 用户认证
- 密码哈希与权限控制
- SQLAlchemy 数据库建模
- MySQL 数据持久化
- 文件上传和图片预览
- 移动端响应式布局
- 错误排查、端口管理和本地开发环境配置

## 隐私说明

本项目仅用于个人学习和私人使用。正式部署前需要进一步完善 HTTPS、图片访问权限、数据备份、账号删除和生产环境密钥管理。
