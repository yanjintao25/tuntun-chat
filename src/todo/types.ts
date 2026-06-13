export type TodoStatus = "pending" | "done" | "cancelled";

export type TodoSource = "chat" | "admin";

export interface TodoRecord {
  id: number;
  openId: string;
  chatId: string;
  title: string;
  dueAt: string;
  remindAt: string;
  status: TodoStatus;
  source: TodoSource;
  rawMessage: string | null;
  remindedAt: string | null;
  dueNotifiedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTodoInput {
  openId: string;
  chatId: string;
  title: string;
  dueAt: string;
  remindAt: string;
  source?: TodoSource;
  rawMessage?: string;
}
