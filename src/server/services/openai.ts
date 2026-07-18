import OpenAI from "openai";
import type { ActivityContract, OnboardingDraft, UsageCandidate } from "../../shared/contracts.js";
import { activityContractSchema, onboardingDraftSchema, usageCandidateSchema } from "../../shared/contracts.js";

const extractionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    candidates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          durationMinutes: { type: ["integer", "null"] },
          opens: { type: ["integer", "null"] },
          observedDate: { type: ["string", "null"] },
          peakWindow: {
            anyOf: [
              { type: "null" },
              { type: "object", additionalProperties: false, properties: { start: { type: "string" }, end: { type: "string" } }, required: ["start", "end"] },
            ],
          },
          confidence: { type: "number" },
          sourceImages: { type: "array", items: { type: "integer" } },
        },
        required: ["name", "durationMinutes", "opens", "observedDate", "peakWindow", "confidence", "sourceImages"],
      },
    },
  },
  required: ["candidates"],
} as const;

const conversationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    assistantMessage: { type: "string" },
    draftPatch: { type: "object", additionalProperties: false },
  },
  required: ["assistantMessage", "draftPatch"],
} as const;

export class OpenAIService {
  private readonly client: OpenAI;
  constructor(private readonly model: string, apiKey: string, baseURL: string) {
    this.client = new OpenAI({ apiKey, baseURL });
  }

  async extractUsage(images: Buffer[]): Promise<UsageCandidate[]> {
    const content: OpenAI.Responses.ResponseInputContent[] = [
      {
        type: "input_text",
        text: "Extract only visible digital-usage evidence from these screenshots. Never infer data that is not visible. Return app names, visible durations, opens, dates, and hourly peak windows. Use a confidence from 0 to 1 and source image indexes.",
      },
      ...images.map((image, index) => ({
        type: "input_image" as const,
        image_url: `data:image/jpeg;base64,${image.toString("base64")}`,
        detail: "high" as const,
        index,
      })),
    ];
    const response = await this.client.responses.create({
      model: this.model,
      input: [{ role: "user", content }],
      text: { format: { type: "json_schema", name: "usage_candidates", strict: true, schema: extractionSchema } },
      max_output_tokens: 2400,
    });
    const parsed = JSON.parse(response.output_text || "{\"candidates\":[]}") as { candidates: unknown[] };
    return parsed.candidates.map((candidate, index) => usageCandidateSchema.parse({
      ...candidate as object,
      id: `candidate-${index}-${Date.now()}`,
      sourceImages: (candidate as { sourceImages?: number[] }).sourceImages ?? [],
    }));
  }

  async continueOnboarding(message: string, draft: OnboardingDraft, history: Array<{ role: string; content: string }>) {
    const response = await this.client.responses.create({
      model: this.model,
      input: [{
        role: "system",
        content: [{ type: "input_text", text: "You are Unhookd, a calm behavior-change coach for digital habits. Ask one useful question at a time. Never diagnose addiction, shame the user, or prescribe medical treatment. Return a concise message and only a JSON-compatible partial draft patch. The user must confirm all extracted hooks and schedules." }],
      }, ...history.slice(-12).map((item) => ({ role: item.role === "assistant" ? "assistant" as const : "user" as const, content: [{ type: "input_text" as const, text: item.content }] })), {
        role: "user",
        content: [{ type: "input_text", text: `Current draft: ${JSON.stringify(draft)}\nNew user message: ${message}` }],
      }],
      text: { format: { type: "json_schema", name: "onboarding_turn", strict: false, schema: conversationSchema } },
      max_output_tokens: 800,
    });
    const parsed = JSON.parse(response.output_text || "{\"assistantMessage\":\"Let’s keep this simple. What would you like help with?\",\"draftPatch\":{}}") as { assistantMessage: string; draftPatch: unknown };
    return { assistantMessage: parsed.assistantMessage, draftPatch: onboardingDraftSchema.partial().parse(parsed.draftPatch ?? {}) };
  }

  async planActivity(draft: OnboardingDraft, recentOutcomes: string[]): Promise<ActivityContract> {
    const response = await this.client.responses.create({
      model: this.model,
      input: [{ role: "user", content: [{ type: "input_text", text: `Create one safe, 30-180 second activity from this approved Unhookd profile. It must be observable by a phone camera or timer and must not require equipment. Profile: ${JSON.stringify(draft)}. Recent outcomes: ${JSON.stringify(recentOutcomes)}` }] }],
      text: { format: { type: "json_schema", name: "activity_contract", strict: true, schema: { type: "object", additionalProperties: false, properties: { title: { type: "string" }, instructions: { type: "array", items: { type: "string" } }, metric: { type: "string", enum: ["count", "duration", "binary"] }, target: { type: "number" }, unit: { type: "string" }, observableCriteria: { type: "array", items: { type: "string" } }, maximumDurationSeconds: { type: "integer" } }, required: ["title", "instructions", "metric", "target", "unit", "observableCriteria", "maximumDurationSeconds"] } } },
      max_output_tokens: 700,
    });
    return activityContractSchema.parse(JSON.parse(response.output_text));
  }
}
