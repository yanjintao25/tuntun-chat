# 部署指南（云服务器）

## 一、前置条件

- 一台有公网 IP 的云服务器（如阿里云、腾讯云、AWS）
- 域名（可选，飞书事件订阅建议使用 HTTPS）
- Node.js 18+

## 二、飞书应用配置（开放平台）

1. 登录 [飞书开放平台](https://open.feishu.cn/app)，创建**企业自建应用**。
2. **凭证与基础信息**：记下 `App ID`、`App Secret`。
3. **权限管理**：申请并发布：
   - 消息与群组：`im:message`、`im:message.group_at_msg`、`im:message.p2p_msg`
   - 若启用日程/待办：按需申请日历、任务相关权限
4. **事件订阅**：
   - 启用「事件订阅」，选择 **Webhook**
   - 请求网址：`https://你的域名/feishu/event`（或 `http://公网IP:端口/feishu/event`，部分环境要求 HTTPS）
   - 订阅事件：勾选「接收消息 v2.0」
   - 可选：填写 Verification Token、Encrypt Key（需在服务端配置并解密）

## 三、服务器部署步骤

### 1. 安装 Node 与克隆代码

```bash
# 安装 Node 18+（以 Ubuntu 为例）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 克隆或上传项目
cd /opt  # 或你的目录
git clone <你的仓库> tuntun-chat
cd tuntun-chat
```

### 2. 环境变量

```bash
cp .env.example .env
# 编辑 .env，填入：
# FEISHU_APP_ID、FEISHU_APP_SECRET、FEISHU_VERIFICATION_TOKEN、FEISHU_ENCRYPT_KEY（若启用）
# OPENAI_API_KEY、OPENAI_BASE_URL（或国内大模型兼容接口）
# PORT=3000
```

### 3. 安装依赖与构建

```bash
npm install
npm run build
```

### 4. 使用 PM2 常驻

```bash
npm install -g pm2
pm2 start dist/index.js --name tuntun-chat
pm2 save
pm2 startup  # 按提示设置开机自启
```

### 5. 反向代理（Nginx，推荐 HTTPS）

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

## 四、验证

1. **健康检查**：`curl https://你的域名/health` 应返回 `{"status":"ok",...}`。
2. **飞书验证**：在开放平台保存「请求网址」后，飞书会发 URL 验证请求，服务需在 1 秒内返回 `challenge`，保存后即验证通过。
3. **发消息**：在飞书里把机器人拉进群或单聊，发送「你好」或「今天有什么日程」，应收到回复。

## 五、后台配置功能开关

- 获取当前配置：`GET https://你的域名/admin/config`
- 更新配置：`PUT https://你的域名/admin/config`，Body 示例：

```json
{
  "schedule": { "enabled": true },
  "todo": { "enabled": true, "reminderMinutes": 15 },
  "dailySummary": { "enabled": true, "summaryTime": "18:00", "scope": "user" }
}
```

生产环境建议为 `/admin/*` 增加鉴权（如 API Key、登录态）。
