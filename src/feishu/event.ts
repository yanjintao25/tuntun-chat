import { Router, Request, Response } from "express";
import { handleEventPayload } from "./handler";

const router = Router();
const VERIFICATION_TOKEN = process.env.FEISHU_VERIFICATION_TOKEN || "";
const ENCRYPT_KEY = process.env.FEISHU_ENCRYPT_KEY || "";

/**
 * 飞书事件订阅 - 统一入口
 * 文档: https://open.feishu.cn/document/server-docs/event-subscription-guide/event-subscription-configure-/request-url-configuration-case
 */
router.post("/", async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  console.log("[feishu] incoming event body:", JSON.stringify(body));

  // 1. URL 验证：飞书配置请求网址时会发 type=url_verification，需 1 秒内原样返回 challenge
  if (body.type === "url_verification") {
    let challenge = body.challenge as string | undefined;
    if (ENCRYPT_KEY && body.encrypt) {
      try {
        const { decrypt } = await import("../utils/encrypt");
        const raw = decrypt(body.encrypt as string, ENCRYPT_KEY);
        const dec = JSON.parse(raw) as { challenge?: string };
        challenge = dec.challenge;
      } catch (e) {
        console.error("[feishu] url_verification decrypt failed", e);
        return res.status(400).send("decrypt error");
      }
    }
    if (challenge) return res.json({ challenge });
    return res.status(400).send("missing challenge");
  }

  // 2. 加密时：请求体为 { encrypt: "..." }，需先解密再解析
  let payload = body;
  if (body.encrypt && ENCRYPT_KEY) {
    try {
      const { decrypt } = await import("../utils/encrypt");
      const raw = decrypt(body.encrypt as string, ENCRYPT_KEY);
      payload = JSON.parse(raw) as Record<string, unknown>;
    } catch (e) {
      console.error("[feishu] decrypt failed", e);
      return res.status(400).send("decrypt error");
    }
  }

  // 3. 尽快返回 200，避免飞书 3 秒重试；实际逻辑异步处理
  res.status(200).send("");

  try {
    await handleEventPayload(payload);
  } catch (err) {
    console.error("[feishu] handle event error", err);
  }
});

export { router as feishuEventRouter };
