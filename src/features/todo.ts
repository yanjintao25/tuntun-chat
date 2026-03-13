import { getFeatureConfig } from "../config/store";

/**
 * 待办提醒：解析用户意图后，可调用飞书待办/任务 API 或自建提醒
 * 文档: https://open.feishu.cn/document/server-docs/task-v2/task/create
 */
export async function runTodo(userMessage: string, openId: string): Promise<string> {
  const config = getFeatureConfig().todo;
  if (!config?.enabled) return "";

  const reminderMins = config.reminderMinutes ?? 15;

  // TODO: 调用飞书 任务/待办 API 或自建提醒表 + 定时任务
  // 1. 用 LLM 从 userMessage 抽取：待办内容、提醒时间
  // 2. 创建待办并设置提醒（或写入 DB + 定时 job 推送）
  // 3. 返回「已添加待办：xxx，将在 N 分钟后提醒」

  return `待办功能已开启（默认提前 ${reminderMins} 分钟提醒）。你可以说「提醒我明天交报告」来添加待办。（接入飞书待办后将自动创建）`;
}
