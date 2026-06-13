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

/**
 * 主动向会话发送文本消息（定时提醒等场景）
 * 文档: https://open.feishu.cn/document/server-docs/im-v1/message/create
 */
export async function sendTextToChat(chatId: string, text: string): Promise<void> {
  const c = getClient();
  await c.im.message.create({
    params: { receive_id_type: "chat_id" },
    data: {
      receive_id: chatId,
      msg_type: "text",
      content: JSON.stringify({ text }),
    },
  });
}
