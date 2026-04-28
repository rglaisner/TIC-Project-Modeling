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
    { title: "Refined Initiative Brief", value: projectData.refinedPitch },
    { title: "Operating Model Options", value: projectData.businessModel },
    { title: "Stakeholder Ecosystem", value: projectData.ecosystem },
    { title: "Talent Persona Simulation", value: projectData.personas },
    { title: "Readiness Gap Analysis", value: projectData.gapAnalysis },
    {
      title: "Market And Adoption Parameters",
      value: projectData.marketParams ? JSON.stringify(projectData.marketParams, null, 2) : "",
    },
    { title: "Briefing Asset Kit", value: projectData.deckPrompts },
    { title: "Execution Prompt Package", value: projectData.portalPrompt },
  ];

  const content = sections
    .map(({ title, value }) => `## ${title}\n\n${value.trim().length > 0 ? value : "_No content yet_"}\n`)
    .join("\n");

  return `${content}\n---\n_Engineered by R.G. Development_\n`;
};
