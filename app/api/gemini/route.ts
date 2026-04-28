import { NextResponse } from "next/server";
import { z } from "zod";
import { buildStepPrompt } from "@/lib/prompts/catalog";
import { initialProjectData } from "@/types/project";

const requestSchema = z.object({
  step: z.number().int().min(1).max(8),
  userInput: z.string().optional(),
  projectData: z
    .object({
      rawPitch: z.string(),
      refinedPitch: z.string(),
      chatHistory: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })),
      businessModel: z.string(),
      ecosystem: z.string(),
      personas: z.string(),
      gapAnalysis: z.string(),
      marketParams: z
        .object({
          avgPrice: z.number(),
          priceStdDev: z.number(),
          initialUsers: z.number(),
          growthRateMean: z.number(),
          growthRateStdDev: z.number(),
          churnRateMean: z.number(),
          churnRateStdDev: z.number(),
          months: z.number(),
          rationale: z.string(),
        })
        .nullable(),
      deckPrompts: z.string(),
      portalPrompt: z.string(),
    })
    .default(initialProjectData),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const geminiModel =
      process.env.GEMINI_MODEL && process.env.GEMINI_MODEL.trim().length > 0
        ? process.env.GEMINI_MODEL.trim()
        : "gemini-2.5-flash";
    if (!geminiApiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
    }

    const parsedBody = requestSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const { step, userInput, projectData } = parsedBody.data;
    const { prompt, systemInstruction } = buildStepPrompt(step, projectData, userInput);

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        maxOutputTokens: 8192,
      },
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Gemini request failed: ${response.status} ${errorText}` },
        { status: 502 }
      );
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json({ error: "Gemini returned an empty response." }, { status: 502 });
    }

    return NextResponse.json({ text });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
