import type { ProjectData } from "@/types/project";

export interface PromptPackage {
  systemInstruction: string;
  prompt: string;
}

export const buildStepPrompt = (step: number, project: ProjectData, userInput?: string): PromptPackage => {
  switch (step) {
    case 1: {
      const context = project.chatHistory
        .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
        .join("\n");
      const latestInput = userInput ?? "";
      return {
        systemInstruction:
          "You are an expert Product Strategist helping Talent Intelligence and HR teams clarify initiative briefs with concise, practical questions.",
        prompt:
          `User input: ${latestInput}\n\nConversation so far:\n${context}\n\n` +
          "Ask focused clarifying questions unless the brief is clear enough to summarize into: challenge, audience, expected outcome, and business value.",
      };
    }
    case 2:
      return {
        systemInstruction: "You are a Talent Strategy leader focused on practical delivery and sustainable operating models.",
        prompt:
          `Analyze this pitch:\n${project.refinedPitch}\n\n` +
          "Provide 3 viable rollout models, pros/cons for each, and a final recommendation.",
      };
    case 3:
      return {
        systemInstruction: "You are an ecosystem strategist focused on stakeholder alignment, incentives, and rollout readiness.",
        prompt:
          `Pitch:\n${project.refinedPitch}\n\nBusiness Model:\n${project.businessModel}\n\n` +
          "Map decision makers, users, champions, blockers, and partners, then provide an engagement plan by group.",
      };
    case 4:
      return {
        systemInstruction: "You are a user research lead simulating realistic stakeholder voices.",
        prompt:
          `Ecosystem context:\n${project.ecosystem}\n\n` +
          "Generate 3-4 personas and simulate a critique conversation. End with concrete strategy adjustments.",
      };
    case 5:
      return {
        systemInstruction: "You are a program strategist focused on pragmatic internal execution.",
        prompt:
          `Validation insights:\n${project.personas}\n\n` +
          "Provide must-haves, phased implementation plan, and a clear execution brief for leadership and delivery teams.",
      };
    case 6:
      return {
        systemInstruction: "You are a data scientist. Return valid JSON only.",
        prompt:
          `Business model context:\n${project.businessModel}\n\n` +
          "Return JSON with fields: avgPrice, priceStdDev, initialUsers, growthRateMean, growthRateStdDev, churnRateMean, churnRateStdDev, months, rationale.",
      };
    case 7:
      return {
        systemInstruction: "You are a senior communications strategist producing practical stakeholder assets.",
        prompt:
          `Gap analysis:\n${project.gapAnalysis}\n\n` +
          "Produce 10 assets: 3 stakeholder interview scripts, 3 partner discussion prompts, 3 leadership-ready pitches, 1 town hall outline.",
      };
    case 8:
      return {
        systemInstruction: "You are a senior full-stack architect writing implementation-ready product prompts.",
        prompt:
          `Gap analysis:\n${project.gapAnalysis}\n\n` +
          "Create a full product build prompt including stack, features, UX flow, and phased delivery details.",
      };
    default:
      return {
        systemInstruction: "You are a helpful assistant.",
        prompt: "No prompt available.",
      };
  }
};
