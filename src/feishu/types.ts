export interface EventPayload {
  header?: { type?: string; schema?: string; event_id?: string; [k: string]: unknown };
  event?: Record<string, unknown>;
  [k: string]: unknown;
}

export interface MessageReceivePayload {
  header: { event_id: string; event_type: string; [k: string]: unknown };
  event: {
    message: {
      message_id: string;
      chat_id: string;
      chat_type: "p2p" | "group";
      content: string;
      message_type: string;
      [k: string]: unknown;
    };
    sender: {
      sender_id: { open_id: string; user_id?: string; [k: string]: unknown };
      sender_type: string;
      [k: string]: unknown;
    };
    [k: string]: unknown;
  };
}
