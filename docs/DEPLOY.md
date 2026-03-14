# 部署指南

## 一、两种部署方式

| 方式 | 适用场景 | 是否需要公网 IP/域名 | 推荐 |
|------|----------|----------------------|------|
| **长连接** | 本地开发、云服务器均可 | 否，只需能访问外网 | ✅ |
| **Webhook** | 云服务器，需要 HTTP 入口 | 是，需公网地址或域名 | 备选 |

推荐优先使用**长连接**：无需公网 IP、域名、Nginx、HTTPS，本地或云服务器跑 `node dist/feishu/ws-client.js` 即可。

---

## 二、飞书应用配置（开放平台）

1. 登录 [飞书开放平台](https://open.feishu.cn/app)，创建**企业自建应用**。
2. **凭证与基础信息**：记下 `App ID`、`App Secret`。
3. **权限管理**：申请并发布，**务必开齐 im:message 相关权限**：
   - `im:message`（获取与发送消息）
   - `im:message.p2p_msg:readonly`（单聊消息）
   - `im:message.group_at_msg:readonly`（群聊 @ 消息）
   - 若启用日程/待办：按需申请日历、任务相关权限
4. **事件订阅**：
   - 启用「事件订阅」
   - **订阅方式** 二选一：
     - **长连接**（推荐）：选择「使用长连接接收事件」，添加事件 `im.message.receive_v1`。  
       注意：需先启动 `node dist/feishu/ws-client.js` 建立连接后，才能保存该配置。
     - **Webhook**：选择「将事件发送至开发者服务器」，请求网址填 `https://你的域名/feishu/event`，订阅 `im.message.receive_v1`。

> **踩坑记录**：若收不到消息，检查权限管理中是否已开通 `im:message.p2p_msg`、`im:message.group_at_msg` 等，缺一不可。

---

## 三、方式一：长连接部署（推荐）

### 前置条件

- Node.js 18+
- 本机或云服务器能访问外网（无需公网 IP 或域名）

### 步骤

```bash
cd /path/to/tuntun-chat
cp .env.example .env
# 编辑 .env，填入 FEISHU_APP_ID、FEISHU_APP_SECRET、OPENAI_API_KEY、OPENAI_BASE_URL、OPENAI_MODEL

npm install
npm run build
node dist/feishu/ws-client.js
```

### 云服务器常驻（可选）

```bash
pm2 start dist/feishu/ws-client.js --name tuntun-chat
pm2 save
pm2 startup
```

### 后台配置 API（可选）

若需要 `/admin/config` 接口，可同时启动 HTTP 服务：

```bash
pm2 start dist/index.js --name tuntun-chat-http
```

---

## 四、方式二：Webhook 部署（云服务器）

### 前置条件

- 云服务器（公网 IP 或域名）
- Node.js 18+
- Nginx（推荐 HTTPS）

### 步骤

```bash
cd /path/to/tuntun-chat
cp .env.example .env
# 编辑 .env，填入 FEISHU_APP_ID、FEISHU_APP_SECRET、FEISHU_VERIFICATION_TOKEN、FEISHU_ENCRYPT_KEY（若启用）
# OPENAI_API_KEY、OPENAI_BASE_URL、OPENAI_MODEL、PORT=3000

npm install
npm run build
pm2 start dist/index.js --name tuntun-chat
```

### Nginx 反向代理（HTTPS 推荐）

```nginx
server {
    listen 443 ssl;
    server_name 你的域名;
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location /feishu/event {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location /admin/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location /health {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

重载 Nginx：`sudo nginx -t && sudo nginx -s reload`。

---

## 五、环境变量说明

| 变量 | 说明 |
|------|------|
| `FEISHU_APP_ID` | 飞书应用 App ID |
| `FEISHU_APP_SECRET` | 飞书应用 App Secret |
| `FEISHU_VERIFICATION_TOKEN` | 事件订阅验证 Token（Webhook 模式可选） |
| `FEISHU_ENCRYPT_KEY` | 事件加密密钥（可选） |
| `OPENAI_API_KEY` | 大模型 API Key（OpenAI 或硅基流动等） |
| `OPENAI_BASE_URL` | 大模型 API 地址，如 `https://api.siliconflow.cn/v1` |
| `OPENAI_MODEL` | 模型名，如 `Qwen/Qwen2.5-72B-Instruct` |
| `PORT` | HTTP 服务端口（仅 Webhook 模式，默认 3000） |

### 硅基流动示例

```env
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.siliconflow.cn/v1
OPENAI_MODEL=Qwen/Qwen2.5-72B-Instruct
```

---

## 六、验证

1. **长连接**：启动 `node dist/feishu/ws-client.js` 后，控制台应看到 `[ws] ws client ready`。
2. **Webhook**：`curl https://你的域名/health` 应返回 `{"status":"ok",...}`。
3. **发消息**：在飞书里单聊或群聊 @ 机器人发「你好」，应收到先确认再大模型回复。

---

## 七、后台配置功能开关

- 获取配置：`GET http://localhost:3000/admin/config`（或你的域名）
- 更新配置：`PUT http://localhost:3000/admin/config`，Body 示例：

```json
{
  "schedule": { "enabled": true },
  "todo": { "enabled": true, "reminderMinutes": 15 },
  "dailySummary": { "enabled": true, "summaryTime": "18:00", "scope": "user" }
}
```

生产环境建议为 `/admin/*` 增加鉴权（如 API Key）。
