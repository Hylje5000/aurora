import { describe, it, expect, vi, beforeEach } from "vitest";

const { MockOpenAI } = vi.hoisted(() => ({ MockOpenAI: vi.fn() }));
vi.mock("openai", () => ({ default: MockOpenAI }));

import { createAIClient, CM_MODEL } from "@/lib/ai";

describe("createAIClient", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
    delete process.env.CM_BASE_URL;
    delete process.env.CM_API_KEY;
    delete process.env.CM_MODEL_NAME;
  });

  it("throws when CM_BASE_URL is absent", () => {
    process.env.CM_API_KEY = "test-key";
    expect(() => createAIClient()).toThrow(/CM_BASE_URL/);
  });

  it("throws when CM_API_KEY is absent", () => {
    process.env.CM_BASE_URL = "https://example.com/api/workspace";
    expect(() => createAIClient()).toThrow(/CM_API_KEY/);
  });

  it("constructs OpenAI with baseURL appended with /v1 and correct apiKey", () => {
    process.env.CM_BASE_URL = "https://example.com/api/workspace";
    process.env.CM_API_KEY = "test-key";
    createAIClient();
    expect(MockOpenAI).toHaveBeenCalledWith({
      baseURL: "https://example.com/api/workspace/v1",
      apiKey: "test-key",
    });
  });

  it("strips trailing slash from CM_BASE_URL before appending /v1", () => {
    process.env.CM_BASE_URL = "https://example.com/api/workspace/";
    process.env.CM_API_KEY = "test-key";
    createAIClient();
    expect(MockOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "https://example.com/api/workspace/v1",
      }),
    );
  });
});

describe("CM_MODEL", () => {
  it("falls back to google/gemma-4-31B-it when CM_MODEL_NAME is not set", () => {
    expect(CM_MODEL).toBe("google/gemma-4-31B-it");
  });

  it("uses CM_MODEL_NAME when set", async () => {
    vi.resetModules();
    process.env.CM_MODEL_NAME = "custom/model";
    const { CM_MODEL: model } = await import("@/lib/ai");
    expect(model).toBe("custom/model");
    delete process.env.CM_MODEL_NAME;
    vi.resetModules();
  });
});
