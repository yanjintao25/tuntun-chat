import { getFeatureConfig } from "../config/store";

/**
 * 每日总结：按配置时间或用户主动触发，汇总当日日程/待办/消息摘要
 * 可结合飞书日历、任务、群消息等 API 拉取数据后交给 LLM 总结
 */
export async function runDailySummary(openId: string): Promise<string> {
  const config = getFeatureConfig().dailySummary;
  if (!config?.enabled) return "";

  const summaryTime = config.summaryTime ?? "18:00";
  const scope = config.scope ?? "user";

  // TODO: 定时任务在 summaryTime 拉取当日数据并推送
  // 1. 拉取用户当日日历事件、待办完成情况（飞书 API）
  // 2. 可选：拉取群消息摘要（若 scope 含 group）
  // 3. 用 LLM 生成「今日总结」并发送给用户

  return `每日总结已开启，默认在 ${summaryTime} 推送（范围：${scope}）。当前为主动触发，返回简要说明。完整版将结合日历与待办数据生成。`;
}
