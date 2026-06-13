import { handleTodoMessage } from "../todo/service";

/**
 * 待办提醒：解析用户意图后写入自建 todos 表，由定时任务推送提醒
 */
export async function runTodo(
  userMessage: string,
  openId: string,
  chatId: string
): Promise<string> {
  return handleTodoMessage({ userMessage, openId, chatId });
}
