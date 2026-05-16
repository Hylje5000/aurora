import OpenAI from "openai";

export const CM_MODEL = process.env.CM_MODEL_NAME ?? "google/gemma-4-31B-it";

export function createAIClient(): OpenAI {
  const baseURL = process.env.CM_BASE_URL;
  const apiKey = process.env.CM_API_KEY;

  if (!baseURL || !apiKey) {
    throw new Error(
      "CM_BASE_URL and CM_API_KEY must be set to use the AI feature",
    );
  }

  return new OpenAI({
    baseURL: baseURL.replace(/\/$/, "") + "/v1",
    apiKey,
  });
}
