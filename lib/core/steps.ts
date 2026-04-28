export interface StepDefinition {
  id: number;
  title: string;
  key: string;
  requiredKeys: string[];
  phase: "Intake" | "Analysis" | "Recommendation" | "Delivery";
  goal: string;
}

export const STEPS: StepDefinition[] = [
  {
    id: 1,
    title: "Initiative Clarification",
    key: "refinedPitch",
    requiredKeys: [],
    phase: "Intake",
    goal: "Capture the rollout objective, audience, and expected impact.",
  },
  {
    id: 2,
    title: "Operating Model Options",
    key: "businessModel",
    requiredKeys: ["refinedPitch"],
    phase: "Analysis",
    goal: "Compare viable delivery models for the initiative.",
  },
  {
    id: 3,
    title: "Stakeholder Ecosystem",
    key: "ecosystem",
    requiredKeys: ["businessModel"],
    phase: "Analysis",
    goal: "Map sponsors, champions, blockers, and adoption partners.",
  },
  {
    id: 4,
    title: "Talent Persona Simulation",
    key: "personas",
    requiredKeys: ["ecosystem"],
    phase: "Analysis",
    goal: "Pressure-test the plan with realistic stakeholder perspectives.",
  },
  {
    id: 5,
    title: "Readiness Gap Analysis",
    key: "gapAnalysis",
    requiredKeys: ["personas"],
    phase: "Recommendation",
    goal: "Identify capability, process, and communication gaps to close.",
  },
  {
    id: 6,
    title: "Market And Adoption Simulation",
    key: "marketParams",
    requiredKeys: ["businessModel"],
    phase: "Recommendation",
    goal: "Estimate rollout assumptions and adoption sensitivity.",
  },
  {
    id: 7,
    title: "Briefing Asset Kit",
    key: "deckPrompts",
    requiredKeys: ["gapAnalysis"],
    phase: "Delivery",
    goal: "Prepare stakeholder-ready messaging and discussion assets.",
  },
  {
    id: 8,
    title: "Execution Prompt Package",
    key: "portalPrompt",
    requiredKeys: ["gapAnalysis"],
    phase: "Delivery",
    goal: "Generate an implementation-ready prompt for downstream execution.",
  },
];
