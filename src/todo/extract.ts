import { chatCompletion } from "../llm/openai";

export type TodoAction = "create" | "list" | "complete" | "cancel" | "unknown";

export interface TodoExtractResult {
  action: TodoAction;
  title?: string;
  due_at?: string;
  todo_id?: number;
  title_keyword?: string;
  message?: string;
}

export interface ExtractTodoIntentOptions {
  userMessage: string;
  reminderMinutes: number;
  defaultDueHour?: number;
}

function getShanghaiNowIso(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}+08:00`;
}

function buildExtractPrompt(options: ExtractTodoIntentOptions): string {
  const defaultHour = options.defaultDueHour ?? 9;
  const now = getShanghaiNowIso();

  return [
    "你是待办意图解析器。根据用户消息输出唯一一段 JSON，不要 markdown，不要额外说明。",
    `当前时间（Asia/Shanghai）：${now}`,
    `默认提前提醒分钟数：${options.reminderMinutes}`,
    `若用户只说「明天」「后天」等未给具体时刻，due_at 默认当天 ${String(defaultHour).padStart(2, "0")}:00:00+08:00。`,
    "字段说明：",
    '- action: "create" | "list" | "complete" | "cancel" | "unknown"',
    "- title: 待办内容（create 时必填）",
    "- due_at: ISO8601 带时区偏移，如 2026-06-14T09:00:00+08:00（create 时必填）",
    "- todo_id: 数字序号（complete/cancel 时优先使用，如用户说「完成第 2 条」）",
    "- title_keyword: 标题关键词（complete/cancel 时用于匹配）",
    '- message: action 为 unknown 时，给用户的追问文案',
    "判定规则：",
    '- 创建：「提醒我…」「添加待办…」→ create',
    '- 列表：「有哪些待办」「我的待办」→ list',
    '- 完成：「完成了」「做完了」「已完成」→ complete',
    '- 取消：「取消待办」「不要提醒了」→ cancel',
    "- 无法判断时 → unknown，并填写 message",
  ].join("\n");
}

function parseJsonFromLlm(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText);
}

function normalizeAction(value: unknown): TodoAction {
  if (value === "create" || value === "list" || value === "complete" || value === "cancel" || value === "unknown") {
    return value;
  }
  return "unknown";
}

function normalizeExtractResult(raw: unknown): TodoExtractResult {
  if (!raw || typeof raw !== "object") {
    return { action: "unknown", message: "我没理解你的待办意图，可以说「提醒我明天 9 点交报告」。" };
  }

  const obj = raw as Record<string, unknown>;
  const action = normalizeAction(obj.action);
  const result: TodoExtractResult = { action };

  if (typeof obj.title === "string" && obj.title.trim()) result.title = obj.title.trim();
  if (typeof obj.due_at === "string" && obj.due_at.trim()) result.due_at = obj.due_at.trim();
  if (typeof obj.title_keyword === "string" && obj.title_keyword.trim()) {
    result.title_keyword = obj.title_keyword.trim();
  }
  if (typeof obj.message === "string" && obj.message.trim()) result.message = obj.message.trim();

  if (typeof obj.todo_id === "number" && Number.isInteger(obj.todo_id) && obj.todo_id > 0) {
    result.todo_id = obj.todo_id;
  } else if (typeof obj.todo_id === "string" && /^\d+$/.test(obj.todo_id)) {
    result.todo_id = Number(obj.todo_id);
  }

  return result;
}

export async function extractTodoIntent(options: ExtractTodoIntentOptions): Promise<TodoExtractResult> {
  const content = await chatCompletion([
    { role: "system", content: buildExtractPrompt(options) },
    { role: "user", content: options.userMessage },
  ]);

  try {
    return normalizeExtractResult(parseJsonFromLlm(content));
  } catch (e) {
    console.error("[todo/extract] parse failed", e, content);
    return {
      action: "unknown",
      message: "我没理解你的待办意图，请说明是要创建、查看、完成还是取消待办。",
    };
  }
}
