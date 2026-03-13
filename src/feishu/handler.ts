import type { EventPayload, MessageReceivePayload } from "./types";
import { handleMessageReceived } from "./message-handler";

export async function handleEventPayload(payload: EventPayload): Promise<void> {
  const header = payload?.header as { type?: string; schema?: string } | undefined;
  const type = header?.type;
  const schema = header?.schema;
  if (!type || !schema) return;

  switch (type) {
    case "im.message.receive_v1":
      await handleMessageReceived(payload as unknown as MessageReceivePayload);
      break;
    default:
      console.log("[feishu] unhandled event type:", type, schema);
  }
}
