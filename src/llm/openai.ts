import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY || "";
const baseURL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

const client = new OpenAI({ apiKey, baseURL });

export async function chatCompletion(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
): Promise<string> {
  const resp = await client.chat.completions.create({
    model,
    messages: messages as OpenAI.ChatCompletionMessageParam[],
    max_tokens: 1024,
  });
  const choice = resp.choices?.[0];
  return choice?.message?.content ?? "";
}
