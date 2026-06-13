# tuntun-chat

带大模型的飞书聊天机器人，部署在自有云服务器上，支持在后台配置机器人的功能（如日程管理、待办提醒、每日总结等）。

## 功能概览

- **飞书消息对接**：Webhook 或长连接接收用户消息，并回复文本。
- **大模型理解**：使用 OpenAI 兼容接口（可替换为国内大模型）做意图识别与对话。
- **可配置能力**（实现状态见下表）：

| 功能 | 状态 | 说明 |
|------|------|------|
| **待办提醒** | ✅ 已实现 | 聊天创建/查询/完成/取消；SQLite 落库；每分钟定时扫描并主动推送提前/到期提醒 |
| **日程管理** | 🚧 占位 | 开关已接，待接入飞书日历 API |
| **每日总结** | 🚧 占位 | 开关已接，待定时拉取数据并用 LLM 生成总结 |

- **待办提醒**可配置：开关、`reminderMinutes`（提前提醒分钟数，默认 15）。
- 配置通过 REST API 读写，后续可加管理后台界面。
- 查库排查待办时：解析出的提醒/到期时间看 `due_at`、`remind_at`；`due_notified_at` 仅表示到期通知是否已推送，新建记录为空是正常的（见 [docs/DATABASE.md](docs/DATABASE.md)）。

## 技术栈

- Node.js + TypeScript
- Express（Webhook + 管理 API）
- 飞书 [@larksuiteoapi/node-sdk](https://www.npmjs.com/package/@larksuiteoapi/node-sdk)
- OpenAI 兼容 API（如 OpenAI / 国内大模型）
- SQLite（功能配置 + 待办等业务数据，可换 PostgreSQL）
- node-cron（待办定时提醒扫描）

## 快速开始

### 1. 克隆与安装

```bash
git clone <repo> tuntun-chat && cd tuntun-chat
npm install
cp .env.example .env
# 编辑 .env，填入飞书 App ID/Secret、大模型 API Key 等
```

### 2. 飞书应用配置

- 在 [飞书开放平台](https://open.feishu.cn/app) 创建企业自建应用，开启机器人并申请消息权限。
- 在「事件订阅」中配置请求网址：`http://本机:3000/feishu/event`（本地开发可用内网穿透如 ngrok/cpolar 暴露到公网）。
- 订阅「接收消息 v2.0」事件。
- **踩坑提示**：一定要在「权限管理」里开齐与 `im:message` 相关的权限（接收单聊/群聊消息、**发送消息**等），否则机器人收不到消息或**待办提醒无法主动推送**。

详见 [docs/DESIGN.md](docs/DESIGN.md) 与 [docs/DEPLOY.md](docs/DEPLOY.md)。

### 3. 本地运行

- **长连接模式**（推荐，飞书订阅方式选「使用长连接接收事件」时）：

```bash
npm run dev:ws
```

- **Webhook 模式**（飞书订阅方式选「将事件发送至开发者服务器」时）：

```bash
npm run dev
```

向机器人发送消息即可测试。待办示例：

- `提醒我明天 9 点交报告` — 创建待办
- `我有哪些待办` — 查看列表
- `完成了交报告` — 标记完成

云服务器部署见 [docs/DEPLOY.md](docs/DEPLOY.md)。

### 4. 后台配置功能开关

```bash
# 查看当前配置
curl http://localhost:3000/admin/config

# 更新配置（示例）
curl -X PUT http://localhost:3000/admin/config \
  -H "Content-Type: application/json" \
  -d '{"schedule":{"enabled":true},"todo":{"enabled":true},"dailySummary":{"enabled":true}}'
```

## 项目结构

```
src/
├── index.ts           # Webhook 入口，挂载路由 + 启动定时任务
├── feishu/            # 飞书事件接收、验签、解密、消息处理、发消息
├── llm/               # 大模型调用与意图识别
├── features/          # 日程、待办、每日总结（薄封装入口）
├── todo/              # 待办：表结构、存储、LLM 抽取、业务逻辑
├── scheduler/         # 定时任务（待办提醒扫描与推送）
├── config/            # 功能配置读写（SQLite）
├── routes/            # 后台配置 API
└── utils/             # 加解密等工具
```

## 文档

- [架构与开发指南](docs/DESIGN.md)
- [工程结构与扩展指南](docs/ARCHITECTURE.md)
- [数据库表结构设计](docs/DATABASE.md)
- [日程 vs 待办说明](docs/SCHEDULE-VS-TODO.md)
- [项目进度与思路](docs/思路.md)
- [后续开发建议](docs/ROADMAP.md)
- [云服务器部署指南](docs/DEPLOY.md)

## 后续开发

详见 **[后续开发建议](docs/ROADMAP.md)**（按 P1 生产就绪 → P2 核心能力/待办增强 → P3 扩展能力 排列）。

近期推荐：**`/admin` 鉴权** → **每日总结** → **日程管理（飞书日历）**。

## License

MIT
