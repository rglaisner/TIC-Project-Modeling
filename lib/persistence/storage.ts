import {
  PERSISTENCE_VERSION,
  initialProjectData,
  type PersistedProjectState,
  type ProjectData,
} from "@/types/project";

export const PERSISTENCE_KEY = "pitch-architect-state";

export interface PersistedEnvelope {
  currentStep: number;
  projectData: ProjectData;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const serializeState = (state: PersistedEnvelope): string => {
  const payload: PersistedProjectState = {
    version: PERSISTENCE_VERSION,
    updatedAt: new Date().toISOString(),
    currentStep: state.currentStep,
    projectData: state.projectData,
  };
  return JSON.stringify(payload, null, 2);
};

export const parseState = (raw: string): PersistedEnvelope | null => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isObject(parsed)) return null;
    const currentStep = typeof parsed.currentStep === "number" ? parsed.currentStep : 1;
    const projectData = isObject(parsed.projectData)
      ? ({ ...initialProjectData, ...parsed.projectData } as ProjectData)
      : initialProjectData;
    return { currentStep, projectData };
  } catch {
    return null;
  }
};

export const toMarkdownExport = (projectData: ProjectData): string => {
  const sections: Array<{ title: string; value: string }> = [
    { title: "Refined Pitch", value: projectData.refinedPitch },
    { title: "Business Model", value: projectData.businessModel },
    { title: "Ecosystem", value: projectData.ecosystem },
    { title: "Persona Simulation", value: projectData.personas },
    { title: "Gap Analysis", value: projectData.gapAnalysis },
    {
      title: "Market Parameters",
      value: projectData.marketParams ? JSON.stringify(projectData.marketParams, null, 2) : "",
    },
    { title: "Deck Prompts", value: projectData.deckPrompts },
    { title: "Portal Prompt", value: projectData.portalPrompt },
  ];

  return sections
    .map(({ title, value }) => `## ${title}\n\n${value.trim().length > 0 ? value : "_No content yet_"}\n`)
    .join("\n");
};
