import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createAIClient, CM_MODEL } from "@/lib/ai";

export async function POST(req: NextRequest) {
  if (!process.env.CM_BASE_URL || !process.env.CM_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messages, maxTokens, temperature } = body as Record<string, unknown>;

  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }
  if (messages.length === 0) {
    return NextResponse.json(
      { error: "messages must not be empty" },
      { status: 400 },
    );
  }

  try {
    const client = createAIClient();
    const completion = await client.chat.completions.create({
      model: CM_MODEL,
      messages: messages as OpenAI.ChatCompletionMessageParam[],
      max_tokens: typeof maxTokens === "number" ? maxTokens : 1024,
      temperature: typeof temperature === "number" ? temperature : 0.2,
    });

    const usage = completion.usage
      ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens,
        }
      : null;

    return NextResponse.json({
      content: completion.choices[0].message.content,
      model: completion.model,
      usage,
    });
  } catch (err) {
    console.error("[/api/ai]", err);
    if (err instanceof OpenAI.APIError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
