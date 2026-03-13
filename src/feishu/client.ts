import * as lark from "@larksuiteoapi/node-sdk";

const appId = process.env.FEISHU_APP_ID || "";
const appSecret = process.env.FEISHU_APP_SECRET || "";

let client: lark.Client | null = null;

function getClient(): lark.Client {
  if (!client) {
    client = new lark.Client({
      appId,
      appSecret,
      disableTokenCache: false,
    });
  }
  return client;
}

/**
 * 回复用户消息（在指定会话下回复某条消息）
 * 使用飞书 im.v1 回复消息 API
 */
export async function replyMessage(
  _chatId: string,
  messageId: string,
  text: string
): Promise<void> {
  const c = getClient();
  await c.im.message.reply({
    path: { message_id: messageId },
    data: {
      content: JSON.stringify({ text }),
      msg_type: "text",
    },
  });
}
