import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { ActivityContract } from "../../shared/contracts.js";

export class GeminiService {
  private readonly ai: GoogleGenAI;
  constructor(private readonly model: string, apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async createEphemeralToken(activity: ActivityContract) {
    const now = Date.now();
    const token = await this.ai.authTokens.create({
      config: {
        uses: 1,
        newSessionExpireTime: new Date(now + 60_000).toISOString(),
        expireTime: new Date(now + 35 * 60_000).toISOString(),
        liveConnectConstraints: {
          model: this.model,
          config: {
            responseModalities: [Modality.AUDIO],
            outputAudioTranscription: {},
            systemInstruction: `You are the Unhookd Live Coach. Be warm, concise, and safety-aware. Guide this approved activity: ${JSON.stringify(activity)}. Start with one short cue that tells the user what you can currently see and what to do next. Give a brief confirmation when visible progress occurs. For count activities, call report_activity_progress after each clearly visible repetition or after every two clear repetitions, with the cumulative total. For duration activities, call it only after visibly continuous activity or a sustained posture. Never send increments or claim certainty beyond what you observe.`,
            tools: [{
              functionDeclarations: [{
                name: "report_activity_progress",
                description: "Report cumulative activity progress only when it is visibly observed.",
                parameters: {
                  type: Type.OBJECT,
                  properties: {
                    observed: { type: Type.NUMBER, description: "Cumulative observed amount, never an increment." },
                    target: { type: Type.NUMBER },
                    confidence: { type: Type.NUMBER, description: "Observation confidence from 0 to 1." },
                    note: { type: Type.STRING },
                  },
                  required: ["observed", "target", "confidence", "note"],
                },
              }],
            }],
          },
        },
      },
    });
    return { token: token.name, model: this.model };
  }
}
