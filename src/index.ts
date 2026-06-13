import "dotenv/config";
import express from "express";
import { feishuEventRouter } from "./feishu/event";
import { adminConfigRouter } from "./routes/admin-config";
import { startTodoReminderScheduler } from "./scheduler/reminder";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// 飞书事件订阅入口（必须与开放平台配置的「请求网址」一致，如 https://域名/feishu/event）
app.use("/feishu/event", feishuEventRouter);

// 后台配置 API（后续可加鉴权）
app.use("/admin/config", adminConfigRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

app.listen(port, () => {
  startTodoReminderScheduler();
  console.log(`[tuntun-chat] server listening on port ${port}`);
  console.log(`  - Feishu event: POST /feishu/event`);
  console.log(`  - Admin config: /admin/config`);
});
