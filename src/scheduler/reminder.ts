import cron from "node-cron";
import { getFeatureConfig } from "../config/store";
import { sendTextToChat } from "../feishu/client";
import {
  findDueNotifications,
  findDueReminders,
  markDueNotified,
  markReminded,
} from "../todo/store";
import type { TodoRecord } from "../todo/types";

let started = false;
let ticking = false;

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

function buildAdvanceReminderText(todo: TodoRecord): string {
  return `⏰ 待办提醒：「${todo.title}」将在 ${formatDateTime(todo.dueAt)} 到期。`;
}

function buildDueNotificationText(todo: TodoRecord): string {
  return `📌 待办到期：「${todo.title}」到时间了。回复「完成了 ${todo.title}」可标记完成。`;
}

async function pushReminder(todo: TodoRecord, text: string): Promise<void> {
  await sendTextToChat(todo.chatId, text);
  console.log(`[scheduler] sent reminder todoId=${todo.id} openId=${todo.openId}`);
}

export async function runTodoReminderTick(): Promise<void> {
  if (ticking) return;
  ticking = true;

  try {
    const config = getFeatureConfig().todo;
    if (!config?.enabled) return;

    const now = new Date().toISOString();

    for (const todo of findDueReminders(now)) {
      try {
        await pushReminder(todo, buildAdvanceReminderText(todo));
        markReminded(todo.id, now);
      } catch (e) {
        console.error(`[scheduler] advance reminder failed todoId=${todo.id}`, e);
      }
    }

    for (const todo of findDueNotifications(now)) {
      try {
        await pushReminder(todo, buildDueNotificationText(todo));
        markDueNotified(todo.id, now);
      } catch (e) {
        console.error(`[scheduler] due notification failed todoId=${todo.id}`, e);
      }
    }
  } finally {
    ticking = false;
  }
}

/**
 * 每分钟扫描待办并推送提醒。Webhook / 长连接入口各调用一次即可（内部单例防重复）。
 */
export function startTodoReminderScheduler(): void {
  if (started) return;
  started = true;

  cron.schedule("* * * * *", () => {
    runTodoReminderTick().catch((e) => {
      console.error("[scheduler] tick error", e);
    });
  });

  console.log("[scheduler] todo reminder scheduler started (every minute)");
}
