import "dotenv/config";
import * as Lark from "@larksuiteoapi/node-sdk";
import { handleMessageReceived } from "./message-handler";
import type { MessageReceivePayload } from "./types";
import { startTodoReminderScheduler } from "../scheduler/reminder";

export async function startFeishuWSClient() {
  const appId = process.env.FEISHU_APP_ID!;
  const appSecret = process.env.FEISHU_APP_SECRET!;

  const wsClient = new Lark.WSClient({
    appId,
    appSecret,
    domain: Lark.Domain.Feishu,
    loggerLevel: Lark.LoggerLevel.info,
  });

  const dispatcher = new Lark.EventDispatcher({
    loggerLevel: Lark.LoggerLevel.info,
  });

  dispatcher.register({
    // 长连接收到消息事件，适配成 MessageReceivePayload 再复用现有逻辑
    "im.message.receive_v1": async (data: any) => {
      console.log("[ws] receive im.message.receive_v1 raw:", JSON.stringify(data));

      try {
        const rawEvent = data?.event ?? data;
        const msg = rawEvent?.message;
        const sender = rawEvent?.sender;

        if (!msg || !sender) {
          console.warn("[ws] missing message or sender on event:", data);
          return;
        }

        const payload: MessageReceivePayload = {
          header: {
            event_id: data.event_id ?? "",
            event_type: data.event_type ?? "",
          },
          event: {
            message: {
              message_id: msg.message_id,
              chat_id: msg.chat_id,
              chat_type: msg.chat_type,
              content: msg.content,
              message_type: msg.message_type,
            },
            sender: {
              sender_id: {
                open_id: sender.sender_id?.open_id,
                user_id: sender.sender_id?.user_id,
              },
              sender_type: sender.sender_type,
            },
          },
        };

        await handleMessageReceived(payload);
      } catch (e) {
        console.error("[ws] handleMessageReceived error", e);
      }
    },
  });

  await wsClient.start({ eventDispatcher: dispatcher });
  startTodoReminderScheduler();
  console.log("[ws] Feishu WS client started");
}

// 单独跑这个文件时用
if (require.main === module) {
  startFeishuWSClient().catch((e) => {
    console.error("[ws] start error", e);
  });
}