# Implementation Plan: ConfidentialMind AI Backend Integration

## Overview

Add `openai` npm package, create `src/lib/ai.ts` client factory, and implement
`POST /api/ai` route that proxies chat completions to ConfidentialMind's Gemma-4
endpoint. No frontend changes in this phase.

---

## Phase 0 — Pre-flight

- [ ] Run all tests to ensure the project is in a good state before starting.
- [ ] After completing tasks, add any TODOs found to this plan.
- [ ] Run `tsc --noEmit` and fix any TypeScript errors.
- [ ] Run `npm test` — must be green before proceeding.
- [ ] Run `prettier --write .`.
- [ ] Re-read this file and update as needed.
- [ ] Update Journal below.
- [ ] Present commit message for user approval. Do not commit until approved.

---

## Phase 1 — Install dependency & AI client lib

- [ ] Run `npm install openai` and confirm it appears in `package.json` dependencies.
- [ ] Create `src/lib/ai.ts`:
  - Export `createAIClient(): OpenAI` — reads `CM_BASE_URL` and `CM_API_KEY` from
    `process.env`, appends `/v1` to `CM_BASE_URL`, constructs and returns an
    `OpenAI` instance with `baseURL` and `apiKey`.
  - Export `CM_MODEL: string` — `process.env.CM_MODEL_NAME ?? "google/gemma-4-31B-it"`.
  - Throw a descriptive error when either env var is missing (called at request time,
    so the route can catch it and return 503).
- [ ] Create `src/test/lib/ai.test.ts`:
  - Mock `openai` with `vi.mock("openai")`.
  - Test: `createAIClient` throws when `CM_BASE_URL` is absent.
  - Test: `createAIClient` throws when `CM_API_KEY` is absent.
  - Test: `createAIClient` constructs `OpenAI` with correct `baseURL` (appended `/v1`)
    and `apiKey`.
  - Test: trailing slash on `CM_BASE_URL` is stripped before `/v1` is appended.
  - Test: `CM_MODEL` falls back to `"google/gemma-4-31B-it"` when env var absent.
  - Test: `CM_MODEL` uses `CM_MODEL_NAME` when set.
- [ ] After completing tasks, add any TODOs found to this plan.
- [ ] Run `tsc --noEmit` and fix any TypeScript errors.
- [ ] Run `npm test` — must be green before proceeding.
- [ ] Run `prettier --write .`.
- [ ] Re-read this file and update as needed.
- [ ] Update Journal below.
- [ ] Present commit message for user approval. Do not commit until approved.

---

## Phase 2 — API Route

- [ ] Create `src/app/api/ai/route.ts`:
  - `export async function POST(req: NextRequest)`
  - Return 503 `{ error: "AI not configured" }` when `CM_BASE_URL` or `CM_API_KEY`
    is absent (checked before parsing body, no SDK call needed).
  - Parse JSON body; return 400 `{ error: "messages required" }` when `messages`
    is missing or not an array, and 400 `{ error: "messages must not be empty" }`
    when the array is empty.
  - Call `createAIClient().chat.completions.create(...)` with `model: CM_MODEL`,
    `messages`, `max_tokens: body.maxTokens ?? 1024`,
    `temperature: body.temperature ?? 0.2`.
  - On success return 200 `{ content, model, usage: { promptTokens, completionTokens, totalTokens } | null }`.
  - Catch `OpenAI.APIError` → 502 `{ error: err.message }`.
  - Catch anything else → 500 `{ error: "Internal server error" }`.
  - `console.error("[/api/ai]", err)` in catch blocks (consistent with other routes).
- [ ] Create `src/test/api/ai.test.ts`:
  - `vi.mock("openai")` at the top using `vi.hoisted` pattern if needed.
  - `beforeEach`: `vi.resetAllMocks()`, clear `CM_BASE_URL` / `CM_API_KEY` / `CM_MODEL_NAME`.
  - Test: 503 when `CM_BASE_URL` absent.
  - Test: 503 when `CM_API_KEY` absent.
  - Test: 400 when body has no `messages` field.
  - Test: 400 when `messages` is empty array.
  - Test: 200 with correct `{ content, model, usage }` shape on happy path.
  - Test: `usage` is null when upstream returns no usage.
  - Test: 502 when upstream throws `OpenAI.APIError`.
  - Test: 500 on unexpected non-OpenAI error.
- [ ] After completing tasks, add any TODOs found to this plan.
- [ ] Run `tsc --noEmit` and fix any TypeScript errors.
- [ ] Run `npm test` — must be green before proceeding.
- [ ] Run `prettier --write .`.
- [ ] Re-read this file and update as needed.
- [ ] Update Journal below.
- [ ] Present commit message for user approval. Do not commit until approved.

---

## Phase 3 — Final Checks & Docs

- [ ] Run `npm run test:coverage` and record the summary in the Journal below.
- [ ] Update `CLAUDE.md` to reflect the new AI route and lib.
- [ ] Ask the user to inspect the package and confirm they are satisfied.

---

## Journal

_(to be filled in as phases complete)_
