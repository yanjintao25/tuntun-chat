import { chatCompletion } from "./openai";
import type { FeatureConfig } from "../config/store";
import { runSchedule } from "../features/schedule";
import { runTodo } from "../features/todo";
import { runDailySummary } from "../features/daily-summary";

export interface RunInput {
  userMessage: string;
  openId: string;
  chatId: string;
  enabledFeatures: FeatureConfig;
}

/**
 * 根据当前开启的功能构造 system 提示，让 LLM 做意图识别或直接回复；
 * 若识别到具体功能（日程/代办/每日总结），则调用对应模块并汇总结果回复。
 */
export async function runLLMAndActions(input: RunInput): Promise<string> {
  const { userMessage, openId, chatId, enabledFeatures } = input;
  const systemPrompt = buildSystemPrompt(enabledFeatures);

  // 先让 LLM 判断意图 + 生成回复或返回结构化指令
  const llmReply = await chatCompletion([
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ]);

  // 简单策略：若 LLM 返回的 content 里包含我们约定的动作标记，则执行对应能力并合并结果
  const content = (llmReply || "").trim();
  const lower = content.toLowerCase();

  let finalReply = content;
  const extras: string[] = [];

  if (enabledFeatures.schedule?.enabled && (lower.includes("[schedule]") || lower.includes("日程"))) {
    try {
      const scheduleResult = await runSchedule(userMessage, openId);
      if (scheduleResult) extras.push("【日程】" + scheduleResult);
    } catch (e) {
      extras.push("【日程】处理失败，请稍后再试。");
    }
  }
  if (enabledFeatures.todo?.enabled && (lower.includes("[todo]") || lower.includes("待办") || lower.includes("提醒"))) {
    try {
      const todoResult = await runTodo(userMessage, openId, chatId);
      if (todoResult) extras.push("【待办】" + todoResult);
    } catch (e) {
      extras.push("【待办】处理失败，请稍后再试。");
    }
  }
  if (enabledFeatures.dailySummary?.enabled && (lower.includes("[daily_summary]") || lower.includes("每日总结"))) {
    try {
      const summaryResult = await runDailySummary(openId);
      if (summaryResult) extras.push("【每日总结】" + summaryResult);
    } catch (e) {
      extras.push("【每日总结】处理失败，请稍后再试。");
    }
  }

  if (extras.length > 0) {
    finalReply = [content.replace(/\s*\[(schedule|todo|daily_summary)\]\s*/gi, "").trim(), ...extras]
      .filter(Boolean)
      .join("\n\n");
  }

  return finalReply || "我没有理解到你的需求，你可以问我：日程安排、待办提醒、每日总结等。";
}

function buildSystemPrompt(config: FeatureConfig): string {
  const parts: string[] = [
    "你是飞书中的智能助手。根据用户消息做出简短、友好的回复。",
    "当前已开启的功能：",
  ];
  if (config.schedule?.enabled) {
    parts.push("- 日程管理：用户提到「日程」「日历」「安排」时，在回复末尾加上 [schedule]，以便系统执行日程相关操作。");
  }
  if (config.todo?.enabled) {
    parts.push("- 待办提醒：用户提到「待办」「提醒」「任务」时，在回复末尾加上 [todo]，以便系统执行待办相关操作。");
  }
  if (config.dailySummary?.enabled) {
    parts.push("- 每日总结：用户明确要求「每日总结」时，在回复末尾加上 [daily_summary]。");
  }
  parts.push("不要编造具体日程或待办内容，仅做意图识别并打标记。回复尽量简短。");
  return parts.join("\n");
}
