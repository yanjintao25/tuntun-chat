import type { MessageReceivePayload } from "./types";
import { replyMessage } from "./client";
import { getFeatureConfig } from "../config/store";
import { runLLMAndActions } from "../llm/runner";

/**
 * 收到用户消息后的处理：读配置 -> 调用 LLM 理解并执行能力 -> 回复
 */
export async function handleMessageReceived(payload: MessageReceivePayload): Promise<void> {
  const { event } = payload;
  const msg = event?.message as MessageReceivePayload["event"]["message"];
  const sender = event?.sender as MessageReceivePayload["event"]["sender"];
  if (!msg?.message_id || !msg?.chat_id || !sender?.sender_id?.open_id) return;

  const text = parseMessageContent(msg.content, msg.message_type);
  if (!text || !text.trim()) return;
  const chatId = msg.chat_id;
  const messageId = msg.message_id;
  const openId = sender.sender_id.open_id;

  // 先快速回一条确认消息，提升主观响应速度
  try {
    await replyMessage(chatId, messageId, "我收到啦，正在帮你处理这条消息～");
  } catch (e) {
    console.error("[message-handler] quick ack failed", e);
  }

  const config = getFeatureConfig();
  let reply: string;
  try {
    reply = await runLLMAndActions({
      userMessage: text.trim(),
      openId,
      chatId,
      enabledFeatures: config,
    });
  } catch (err) {
    console.error("[message-handler] runLLMAndActions error", err);
    reply = "处理消息时出错了，请稍后再试。";
  }

  await replyMessage(chatId, messageId, reply);
}

function parseMessageContent(content: string, messageType: string): string {
  if (messageType !== "text") {
    try {
      const j = JSON.parse(content) as Record<string, unknown>;
      const text = j?.text as string | undefined;
      return text ?? "";
    } catch {
      return "";
    }
  }
  try {
    const j = JSON.parse(content) as { text?: string };
    return j?.text ?? "";
  } catch {
    return content;
  }
}
