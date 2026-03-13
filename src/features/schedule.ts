import { getFeatureConfig } from "../config/store";

/**
 * 日程管理：解析用户意图后，可调用飞书日历 API 创建/查询日程
 * 文档: https://open.feishu.cn/document/server-docs/calendar-v4/calendar-event/create
 */
export async function runSchedule(userMessage: string, openId: string): Promise<string> {
  const config = getFeatureConfig().schedule;
  if (!config?.enabled) return "";

  // TODO: 调用飞书 日历事件 API
  // 1. 用 LLM 从 userMessage 抽取：标题、开始时间、结束时间、是否全天
  // 2. 用 lark client 创建 calendar_event
  // 3. 返回「已创建日程：xxx」

  return "日程功能已开启。你可以说「明天下午3点开会」来创建日程。（接入飞书日历时将自动创建）";
}
