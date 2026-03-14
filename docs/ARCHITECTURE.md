# 工程结构与扩展指南

本文档说明项目各模块的职责、数据流向，以及如何添加新功能。

---

## 一、整体架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          事件入口（二选一）                                │
│  ┌─────────────────────────┐      ┌─────────────────────────────────┐   │
│  │ 长连接 (ws-client.ts)   │      │ Webhook (event.ts → handler.ts)  │   │
│  │ 飞书 SDK WebSocket      │      │ POST /feishu/event               │   │
│  └───────────┬─────────────┘      └──────────────┬──────────────────┘   │
└──────────────┼──────────────────────────────────┼───────────────────────┘
               │                                  │
               └──────────────┬───────────────────┘
                              ▼
               ┌──────────────────────────────────┐
               │ message-handler.ts               │
               │ 解析消息 → 先回复「已收到」        │
               │ → 读配置 → runLLMAndActions      │
               └──────────────┬───────────────────┘
                              │
               ┌──────────────┼──────────────┐
               ▼              ▼              ▼
        ┌────────────┐ ┌────────────┐ ┌─────────────────────┐
        │ llm/runner │ │ config/    │ │ feishu/client.ts    │
        │ 意图识别   │ │ 功能配置   │ │ 调飞书 API 回复消息  │
        │ + 调用能力 │ │ schedule/  │ └─────────────────────┘
        └─────┬──────┘ │ todo/...   │
              │        └────────────┘
              ▼
        ┌─────────────────────────────────────────┐
        │ features/                                │
        │ schedule.ts | todo.ts | daily-summary.ts │
        │ 具体业务逻辑（日程/待办/每日总结）         │
        └─────────────────────────────────────────┘
```

---

## 二、目录结构与模块职责

### 2.1 入口层

| 文件 | 职责 |
|------|------|
| `src/index.ts` | Express HTTP 服务。挂载 `/feishu/event`（Webhook）、`/admin/config`、`/health`。仅 Webhook 模式使用。 |
| `src/feishu/ws-client.ts` | 长连接客户端。通过飞书 SDK WebSocket 接收事件，将 `im.message.receive_v1` 适配后交给 `handleMessageReceived`。**长连接模式的主入口**。 |

### 2.2 飞书事件层 (`src/feishu/`)

| 文件 | 职责 |
|------|------|
| `event.ts` | Webhook 路由。处理 URL 验证、解密、先返回 200，再异步调用 `handleEventPayload`。 |
| `handler.ts` | 事件分发。根据 `header.type` 将 `im.message.receive_v1` 转给 `handleMessageReceived`，其它事件打印未处理日志。 |
| `message-handler.ts` | **消息处理核心**。解析消息内容 → 先快速回复「已收到」→ 读功能配置 → 调 `runLLMAndActions` → 用 `replyMessage` 发最终回复。 |
| `client.ts` | 飞书 API 封装。`replyMessage(chatId, messageId, text)` 调用 `im.message.reply` 回复消息。 |
| `types.ts` | 类型定义。`EventPayload`、`MessageReceivePayload` 等。 |

### 2.3 大模型层 (`src/llm/`)

| 文件 | 职责 |
|------|------|
| `openai.ts` | 大模型调用。`chatCompletion(messages)` 调用 OpenAI 兼容 API，支持 `OPENAI_BASE_URL`、`OPENAI_MODEL` 环境变量。 |
| `runner.ts` | **意图识别与能力编排**。根据 `enabledFeatures` 构造 system prompt，调用 `chatCompletion`，解析 LLM 回复中的 `[schedule]`、`[todo]`、`[daily_summary]` 标记，按需调用 `runSchedule`、`runTodo`、`runDailySummary`，并汇总结果。 |

### 2.4 功能层 (`src/features/`)

| 文件 | 职责 |
|------|------|
| `schedule.ts` | 日程管理。`runSchedule(userMessage, openId)`。当前为占位实现，TODO：接入飞书日历 API。 |
| `todo.ts` | 待办提醒。`runTodo(userMessage, openId)`。当前为占位实现，TODO：接入飞书待办或自建提醒。 |
| `daily-summary.ts` | 每日总结。`runDailySummary(openId)`。当前为占位实现，TODO：定时拉取数据并用 LLM 生成总结。 |

### 2.5 配置层 (`src/config/`)

| 文件 | 职责 |
|------|------|
| `store.ts` | 功能配置存储。SQLite 表 `config`，`getFeatureConfig()` / `setFeatureConfig()` 读写 `schedule`、`todo`、`dailySummary` 的开关和参数。 |

### 2.6 路由层 (`src/routes/`)

| 文件 | 职责 |
|------|------|
| `admin-config.ts` | `GET/PUT /admin/config`，读写功能配置，供管理后台或脚本调用。 |

### 2.7 工具层 (`src/utils/`)

| 文件 | 职责 |
|------|------|
| `encrypt.ts` | 飞书事件 body 解密（AES）。Webhook 模式下若配置了 Encrypt Key 时使用。 |

---

## 三、数据流向（单条消息）

1. 用户发消息 → 飞书推 `im.message.receive_v1`（长连接 / Webhook）
2. `ws-client` 或 `event` → `handler` → `handleMessageReceived`
3. `message-handler` 解析文本，先 `replyMessage("我收到啦...")`
4. `getFeatureConfig()` 读当前功能开关
5. `runLLMAndActions({ userMessage, openId, enabledFeatures })`
6. `runner` 构造 system prompt，调 `chatCompletion`，解析 `[schedule]` 等标记
7. 若命中标记，调 `runSchedule` / `runTodo` / `runDailySummary`，汇总到 `finalReply`
8. `replyMessage(chatId, messageId, finalReply)` 发最终回复

---

## 四、如何添加新功能

### 4.1 添加新的「可配置能力模块」（如：天气查询）

1. **在 `config/store.ts` 中扩展 `FeatureConfig`**：
   ```ts
   export interface FeatureConfig {
     schedule: { ... };
     todo: { ... };
     dailySummary: { ... };
     weather: { enabled: boolean; city?: string };  // 新增
   }
   const DEFAULT_CONFIG = {
     ...
     weather: { enabled: false, city: "" },
   };
   ```

2. **新增 `src/features/weather.ts`**：
   ```ts
   import { getFeatureConfig } from "../config/store";
   export async function runWeather(userMessage: string, openId: string): Promise<string> {
     const config = getFeatureConfig().weather;
     if (!config?.enabled) return "";
     // 调用天气 API，返回结果
     return "北京今天晴，25℃。";
   }
   ```

3. **在 `llm/runner.ts` 中**：
   - `buildSystemPrompt` 里增加对 weather 的说明和 `[weather]` 标记约定；
   - `runLLMAndActions` 中解析 `[weather]`，调用 `runWeather`，并入 `extras`。

4. **（可选）在 `admin-config` 中**：`FeatureConfig` 已扩展，`PUT /admin/config` 会自动支持 `weather` 字段。

### 4.2 添加新的飞书事件类型（如：机器人进群）

1. **在 `feishu/handler.ts` 或 `ws-client.ts` 的 `dispatcher.register` 中**：
   ```ts
   "im.chat.member.bot.added_v1": async (data: any) => {
     // 处理机器人进群
   },
   ```

2. 若事件结构与 `MessageReceivePayload` 不同，可在 `types.ts` 中新增对应类型。

### 4.3 添加新的飞书 API 调用（如：发卡片消息）

1. **在 `feishu/client.ts` 中** 新增封装函数，例如：
   ```ts
   export async function sendCardMessage(chatId: string, card: object): Promise<void> {
     const c = getClient();
     await c.im.message.create({ ... });
   }
   ```

2. 在 `message-handler` 或 `features/*` 中按需调用。

### 4.4 更换或扩展大模型

- 修改 `.env` 的 `OPENAI_BASE_URL`、`OPENAI_MODEL` 即可切换兼容接口。
- 若需流式输出、多轮对话等，在 `llm/openai.ts` 中扩展 `chatCompletion` 或新增函数，再在 `runner` 中调用。

---

## 五、扩展时的注意事项

- **意图识别**：当前依赖 LLM 在回复中打 `[schedule]` 等标记，可改为更结构化的输出（如 JSON）以提升稳定性。
- **配置存储**：`FeatureConfig` 新增字段时，需同步更新 `DEFAULT_CONFIG` 和 `setFeatureConfig` 的合并逻辑。
- **错误处理**：`message-handler` 和 `runner` 已对 LLM、功能模块做了 try/catch，失败时返回友好提示；新增模块建议同样包一层 try/catch。
- **长连接 vs Webhook**：两种入口最终都会调用 `handleMessageReceived`，业务逻辑只需写一份。
