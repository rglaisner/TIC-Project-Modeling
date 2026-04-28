export interface StepDefinition {
  id: number;
  title: string;
  key: string;
  requiredKeys: string[];
}

export const STEPS: StepDefinition[] = [
  { id: 1, title: "Clarify Pitch", key: "refinedPitch", requiredKeys: [] },
  { id: 2, title: "Business Model", key: "businessModel", requiredKeys: ["refinedPitch"] },
  { id: 3, title: "Ecosystem", key: "ecosystem", requiredKeys: ["businessModel"] },
  { id: 4, title: "Persona Simulation", key: "personas", requiredKeys: ["ecosystem"] },
  { id: 5, title: "Gap Analysis", key: "gapAnalysis", requiredKeys: ["personas"] },
  { id: 6, title: "Market Simulation", key: "marketParams", requiredKeys: ["businessModel"] },
  { id: 7, title: "Deck Prompts", key: "deckPrompts", requiredKeys: ["gapAnalysis"] },
  { id: 8, title: "Portal Prompt", key: "portalPrompt", requiredKeys: ["gapAnalysis"] },
];
