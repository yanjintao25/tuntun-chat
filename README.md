# tuntun-chat

带大模型的飞书聊天机器人，部署在自有云服务器上，支持在后台配置机器人的功能（如日程管理、待办提醒、每日总结等）。

## 功能概览

- **飞书消息对接**：通过飞书开放平台「事件订阅」接收用户消息，并回复文本。
- **大模型理解**：使用 OpenAI 兼容接口（可替换为国内大模型）做意图识别与对话。
- **可配置能力**：
  - **日程管理**：开关 + 默认日历（接入飞书日历时可创建/查询日程）。
  - **待办提醒**：开关 + 提醒提前分钟数（可接入飞书待办或自建提醒）。
  - **每日总结**：开关 + 总结时间与范围（可定时拉取日历/待办并生成总结）。

配置通过 REST API 读写，后续可加管理后台界面。

## 技术栈

- Node.js + TypeScript
- Express（Webhook + 管理 API）
- 飞书 [@larksuiteoapi/node-sdk](https://www.npmjs.com/package/@larksuiteoapi/node-sdk)
- OpenAI 兼容 API（如 OpenAI / 国内大模型）
- SQLite（功能配置存储，可换 PostgreSQL）

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

详见 [docs/DESIGN.md](docs/DESIGN.md) 与 [docs/DEPLOY.md](docs/DEPLOY.md)。

### 3. 本地运行

```bash
npm run dev
```

向机器人发送消息即可测试。云服务器部署见 [docs/DEPLOY.md](docs/DEPLOY.md)。

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
├── index.ts           # 入口，挂载路由
├── feishu/            # 飞书事件接收、验签、解密、消息处理
├── llm/               # 大模型调用与意图识别
├── features/          # 日程、待办、每日总结等可配置功能
├── config/            # 功能配置读写（SQLite）
├── routes/            # 后台配置 API
└── utils/             # 加解密等工具
```

## 文档

- [架构与开发指南](docs/DESIGN.md)
- [云服务器部署指南](docs/DEPLOY.md)

## 后续可扩展

- 管理后台：为 `/admin/config` 做简单 Web 界面。
- 飞书长连接：免公网 IP 接收事件（仅企业自建）。
- 日程/待办真实对接：调飞书日历、任务 API 完成创建与提醒。
- 定时任务：在每日总结时间自动拉取数据并推送。

## License

MIT
