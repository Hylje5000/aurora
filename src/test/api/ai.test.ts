import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate, MockOpenAI } = vi.hoisted(() => {
  const mockCreate = vi.fn();
  const MockOpenAI = vi.fn(() => ({
    chat: { completions: { create: mockCreate } },
  }));
  // Attach APIError so instanceof checks work
  (MockOpenAI as unknown as Record<string, unknown>).APIError =
    class APIError extends Error {
      status: number;
      constructor(message: string, status = 502) {
        super(message);
        this.name = "APIError";
        this.status = status;
      }
    };
  return { mockCreate, MockOpenAI };
});

vi.mock("openai", () => ({ default: MockOpenAI }));
vi.mock("@/lib/db", () => ({ query: vi.fn() }));

import { POST } from "@/app/api/ai/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
}

const MESSAGES = [{ role: "user", content: "Analyse the situation." }];

describe("POST /api/ai", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.CM_BASE_URL;
    delete process.env.CM_API_KEY;
    delete process.env.CM_MODEL_NAME;
  });

  it("returns 503 when CM_BASE_URL is absent", async () => {
    process.env.CM_API_KEY = "key";
    const res = await POST(makeRequest({ messages: MESSAGES }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/not configured/);
  });

  it("returns 503 when CM_API_KEY is absent", async () => {
    process.env.CM_BASE_URL = "https://example.com/api/ws";
    const res = await POST(makeRequest({ messages: MESSAGES }));
    expect(res.status).toBe(503);
  });

  it("returns 400 when messages field is missing", async () => {
    process.env.CM_BASE_URL = "https://example.com/api/ws";
    process.env.CM_API_KEY = "key";
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/messages required/);
  });

  it("returns 400 when messages is an empty array", async () => {
    process.env.CM_BASE_URL = "https://example.com/api/ws";
    process.env.CM_API_KEY = "key";
    const res = await POST(makeRequest({ messages: [] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/empty/);
  });

  it("returns 200 with content, model, and usage on success", async () => {
    process.env.CM_BASE_URL = "https://example.com/api/ws";
    process.env.CM_API_KEY = "key";
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "Tactical situation normal." } }],
      model: "google/gemma-4-31B-it",
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    });

    const res = await POST(makeRequest({ messages: MESSAGES }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.content).toBe("Tactical situation normal.");
    expect(body.model).toBe("google/gemma-4-31B-it");
    expect(body.usage).toEqual({
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
    });
  });

  it("returns null usage when upstream omits it", async () => {
    process.env.CM_BASE_URL = "https://example.com/api/ws";
    process.env.CM_API_KEY = "key";
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "OK" } }],
      model: "google/gemma-4-31B-it",
      usage: null,
    });

    const res = await POST(makeRequest({ messages: MESSAGES }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.usage).toBeNull();
  });

  it("returns 502 when upstream throws OpenAI.APIError", async () => {
    process.env.CM_BASE_URL = "https://example.com/api/ws";
    process.env.CM_API_KEY = "key";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const APIError = (MockOpenAI as any).APIError;
    mockCreate.mockRejectedValueOnce(new APIError("upstream timeout"));

    const res = await POST(makeRequest({ messages: MESSAGES }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toMatch(/upstream timeout/);
  });

  it("returns 500 on unexpected error", async () => {
    process.env.CM_BASE_URL = "https://example.com/api/ws";
    process.env.CM_API_KEY = "key";
    mockCreate.mockRejectedValueOnce(new Error("unexpected"));

    const res = await POST(makeRequest({ messages: MESSAGES }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Internal/);
  });

  it("passes maxTokens and temperature from request body to the model", async () => {
    process.env.CM_BASE_URL = "https://example.com/api/ws";
    process.env.CM_API_KEY = "key";
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "OK" } }],
      model: "google/gemma-4-31B-it",
      usage: null,
    });

    await POST(
      makeRequest({ messages: MESSAGES, maxTokens: 256, temperature: 0.7 }),
    );
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 256, temperature: 0.7 }),
    );
  });
});
