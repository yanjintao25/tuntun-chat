import { getFeatureConfig } from "../config/store";
import { extractTodoIntent } from "./extract";
import {
  createTodo,
  getTodoById,
  listPendingTodos,
  markCancelled,
  markDone,
} from "./store";
import type { TodoRecord } from "./types";

export interface HandleTodoInput {
  userMessage: string;
  openId: string;
  chatId: string;
}

function computeRemindAt(dueAt: string, reminderMinutes: number): string {
  const dueMs = Date.parse(dueAt);
  if (Number.isNaN(dueMs)) throw new Error(`Invalid dueAt: ${dueAt}`);
  return new Date(dueMs - reminderMinutes * 60 * 1000).toISOString();
}

function formatDateTime(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms));
}

function formatTodoLine(index: number, todo: TodoRecord): string {
  return `${index}. [${formatDateTime(todo.dueAt)}] ${todo.title}`;
}

function resolveTargetTodo(
  openId: string,
  todoId?: number,
  titleKeyword?: string
): TodoRecord | undefined {
  if (todoId) return getTodoById(todoId, openId);

  if (!titleKeyword) return undefined;

  const pending = listPendingTodos(openId);
  const keyword = titleKeyword.toLowerCase();
  return pending.find((t) => t.title.toLowerCase().includes(keyword));
}

async function handleCreate(
  input: HandleTodoInput,
  title?: string,
  dueAt?: string,
  reminderMinutes?: number
): Promise<string> {
  const mins = reminderMinutes ?? 15;

  if (!title?.trim()) {
    return "请告诉我要提醒的事项内容，例如：交报告、开会、还书。";
  }

  if (!dueAt?.trim()) {
    return "请告诉我具体提醒时间，例如：明天上午 9 点、今晚 8 点。";
  }

  const dueMs = Date.parse(dueAt);
  if (Number.isNaN(dueMs)) {
    return "提醒时间我没解析成功，请换个说法，例如：明天 9:00。";
  }

  if (dueMs <= Date.now()) {
    return "提醒时间需要晚于当前时间，请换一个未来的时间。";
  }

  const remindAt = computeRemindAt(dueAt, mins);
  const todo = createTodo({
    openId: input.openId,
    chatId: input.chatId,
    title: title.trim(),
    dueAt: new Date(dueMs).toISOString(),
    remindAt,
    rawMessage: input.userMessage,
  });

  return `已添加待办：${todo.title}。将在 ${formatDateTime(remindAt)} 提醒你（到期 ${formatDateTime(todo.dueAt)}）。`;
}

function handleList(openId: string): string {
  const todos = listPendingTodos(openId);
  if (todos.length === 0) return "你当前没有待办事项。";
  return ["你有以下待办：", ...todos.map((t, i) => formatTodoLine(i + 1, t))].join("\n");
}

function handleComplete(openId: string, todoId?: number, titleKeyword?: string): string {
  const target = resolveTargetTodo(openId, todoId, titleKeyword);
  if (!target) {
    return todoId
      ? `没有找到编号为 ${todoId} 的待办，可以说「我的待办」查看列表。`
      : "没有找到要完成的待办，可以说「完成第 1 条」或带上事项关键词。";
  }

  const ok = markDone(target.id, openId, new Date().toISOString());
  return ok ? `已标记完成：${target.title}` : `待办「${target.title}」无法标记完成，可能已处理过了。`;
}

function handleCancel(openId: string, todoId?: number, titleKeyword?: string): string {
  const target = resolveTargetTodo(openId, todoId, titleKeyword);
  if (!target) {
    return todoId
      ? `没有找到编号为 ${todoId} 的待办，可以说「我的待办」查看列表。`
      : "没有找到要取消的待办，可以说「取消第 1 条」或带上事项关键词。";
  }

  const ok = markCancelled(target.id, openId, new Date().toISOString());
  return ok ? `已取消待办：${target.title}` : `待办「${target.title}」无法取消，可能已处理过了。`;
}

export async function handleTodoMessage(input: HandleTodoInput): Promise<string> {
  const config = getFeatureConfig().todo;
  if (!config?.enabled) return "";

  const reminderMinutes = config.reminderMinutes ?? 15;
  const intent = await extractTodoIntent({
    userMessage: input.userMessage,
    reminderMinutes,
  });

  switch (intent.action) {
    case "create":
      return handleCreate(input, intent.title, intent.due_at, reminderMinutes);
    case "list":
      return handleList(input.openId);
    case "complete":
      return handleComplete(input.openId, intent.todo_id, intent.title_keyword);
    case "cancel":
      return handleCancel(input.openId, intent.todo_id, intent.title_keyword);
    case "unknown":
    default:
      return intent.message ?? "我没理解你的待办需求，你可以说：提醒我明天 9 点交报告、我的待办、完成第 1 条。";
  }
}
