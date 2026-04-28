export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface MarketParams {
  avgPrice: number;
  priceStdDev: number;
  initialUsers: number;
  growthRateMean: number;
  growthRateStdDev: number;
  churnRateMean: number;
  churnRateStdDev: number;
  months: number;
  rationale: string;
}

export interface ProjectData {
  rawPitch: string;
  refinedPitch: string;
  chatHistory: ChatMessage[];
  businessModel: string;
  ecosystem: string;
  personas: string;
  gapAnalysis: string;
  marketParams: MarketParams | null;
  deckPrompts: string;
  portalPrompt: string;
}

export interface PersistedProjectState {
  version: number;
  updatedAt: string;
  currentStep: number;
  projectData: ProjectData;
}

export const PERSISTENCE_VERSION = 1;

export const initialProjectData: ProjectData = {
  rawPitch: "",
  refinedPitch: "",
  chatHistory: [],
  businessModel: "",
  ecosystem: "",
  personas: "",
  gapAnalysis: "",
  marketParams: null,
  deckPrompts: "",
  portalPrompt: "",
};
