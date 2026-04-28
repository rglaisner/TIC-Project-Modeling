"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { marked } from "marked";
import { STEPS } from "@/lib/core/steps";
import { toMarkdownExport, serializeState, parseState } from "@/lib/persistence/storage";
import { useProfile } from "@/hooks/useProfile";
import { useProjectState } from "@/hooks/useProjectState";
import { useResources } from "@/hooks/useResources";
import { initialProjectData, type MarketParams, type ProjectData } from "@/types/project";

interface GeminiPayload {
  step: number;
  userInput?: string;
  projectData: typeof initialProjectData;
}

interface GeminiResponse {
  text: string;
}

type WorkspaceTab = "workflow" | "insights" | "briefing";

const parseMarketParams = (raw: string): MarketParams | null => {
  const sanitized = raw.replace(/```json/g, "").replace(/```/g, "").trim();
  try {
    const parsed = JSON.parse(sanitized) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const candidate = parsed as Record<string, unknown>;
    if (
      typeof candidate.avgPrice !== "number" ||
      typeof candidate.priceStdDev !== "number" ||
      typeof candidate.initialUsers !== "number" ||
      typeof candidate.growthRateMean !== "number" ||
      typeof candidate.growthRateStdDev !== "number" ||
      typeof candidate.churnRateMean !== "number" ||
      typeof candidate.churnRateStdDev !== "number" ||
      typeof candidate.months !== "number" ||
      typeof candidate.rationale !== "string"
    ) {
      return null;
    }
    return {
      avgPrice: candidate.avgPrice,
      priceStdDev: candidate.priceStdDev,
      initialUsers: candidate.initialUsers,
      growthRateMean: candidate.growthRateMean,
      growthRateStdDev: candidate.growthRateStdDev,
      churnRateMean: candidate.churnRateMean,
      churnRateStdDev: candidate.churnRateStdDev,
      months: candidate.months,
      rationale: candidate.rationale,
    };
  } catch {
    return null;
  }
};

export function AppShell() {
  const profile = useProfile();
  const { currentStep, setCurrentStep, projectData, setProjectData, canAccessStep, completedSteps, resetAll } =
    useProjectState();
  const [chatInput, setChatInput] = useState("");
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("workflow");
  const [lastGeneratedAtByStep, setLastGeneratedAtByStep] = useState<Partial<Record<number, string>>>({});
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);

  const geminiResource = useResources<GeminiResponse, GeminiPayload>(async (payload) => {
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error ?? "Gemini request failed.");
    }
    return (await response.json()) as GeminiResponse;
  });

  const currentStepDefinition = useMemo(
    () => STEPS.find((step) => step.id === currentStep) ?? STEPS[0],
    [currentStep]
  );

  const confidenceScore = useMemo(() => Math.round((completedSteps.size / STEPS.length) * 100), [completedSteps.size]);
  const confidenceLabel =
    confidenceScore >= 85 ? "High confidence" : confidenceScore >= 60 ? "Moderate confidence" : "Early draft";

  const nextIncompleteStep = useMemo(() => STEPS.find((step) => !completedSteps.has(step.id))?.id, [completedSteps]);

  const getStepValue = (stepId: number, data: ProjectData): string => {
    const step = STEPS.find((item) => item.id === stepId);
    if (!step) return "";
    if (step.id === 6) {
      return data.marketParams ? JSON.stringify(data.marketParams, null, 2) : "";
    }
    const value = data[step.key as keyof ProjectData];
    return typeof value === "string" ? value : "";
  };

  const createExecutiveBrief = (): string => {
    const lines = [
      `### Initiative Summary`,
      projectData.refinedPitch || "_No summary yet_",
      ``,
      `### Delivery Model Recommendation`,
      projectData.businessModel || "_No recommendation yet_",
      ``,
      `### Stakeholder Dynamics`,
      projectData.ecosystem || "_No ecosystem assessment yet_",
      ``,
      `### Readiness And Risk Gaps`,
      projectData.gapAnalysis || "_No risk analysis yet_",
      ``,
      `### Delivery Assets`,
      projectData.deckPrompts || "_No delivery assets yet_",
      ``,
      `### Execution Prompt`,
      projectData.portalPrompt || "_No execution prompt yet_",
    ];
    return lines.join("\n");
  };

  const runStep = async (stepId: number): Promise<void> => {
    const data = await geminiResource.execute({ step: stepId, projectData });
    if (!data) return;
    if (stepId === 2) setProjectData((current) => ({ ...current, businessModel: data.text }));
    if (stepId === 3) setProjectData((current) => ({ ...current, ecosystem: data.text }));
    if (stepId === 4) setProjectData((current) => ({ ...current, personas: data.text }));
    if (stepId === 5) setProjectData((current) => ({ ...current, gapAnalysis: data.text }));
    if (stepId === 6) {
      const params = parseMarketParams(data.text);
      if (!params) {
        throw new Error("Market simulation output was not valid JSON.");
      }
      setProjectData((current) => ({ ...current, marketParams: params }));
    }
    if (stepId === 7) setProjectData((current) => ({ ...current, deckPrompts: data.text }));
    if (stepId === 8) setProjectData((current) => ({ ...current, portalPrompt: data.text }));
    setLastGeneratedAtByStep((current) => ({ ...current, [stepId]: new Date().toISOString() }));
  };

  const onChatSend = async (): Promise<void> => {
    if (!chatInput.trim()) return;
    const message = chatInput.trim();
    setChatInput("");
    setProjectData((current) => ({
      ...current,
      rawPitch: message,
      chatHistory: [...current.chatHistory, { role: "user", content: message }],
    }));

    const data = await geminiResource.execute({
      step: 1,
      userInput: message,
      projectData: {
        ...projectData,
        chatHistory: [...projectData.chatHistory, { role: "user", content: message }],
      },
    });
    if (!data) return;
    setProjectData((current) => ({
      ...current,
      refinedPitch: data.text,
      chatHistory: [...current.chatHistory, { role: "assistant", content: data.text }],
    }));
    setLastGeneratedAtByStep((current) => ({ ...current, 1: new Date().toISOString() }));
  };

  const downloadFile = (filename: string, content: string, mimeType: string): void => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importState = (file: File): void => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = typeof reader.result === "string" ? reader.result : "";
      const parsed = parseState(raw);
      if (!parsed) {
        alert("Could not import file. Please upload a valid project JSON export.");
        return;
      }
      setCurrentStep(parsed.currentStep);
      setProjectData(parsed.projectData);
    };
    reader.readAsText(file);
  };

  const clearCurrentStep = (): void => {
    const stepId = currentStep;
    setProjectData((current) => {
      if (stepId === 1) {
        return { ...current, rawPitch: "", refinedPitch: "", chatHistory: [] };
      }
      if (stepId === 6) {
        return { ...current, marketParams: null };
      }
      const step = STEPS.find((item) => item.id === stepId);
      if (!step) return current;
      return { ...current, [step.key]: "" };
    });
    setLastGeneratedAtByStep((current) => ({ ...current, [stepId]: undefined }));
  };

  const duplicateInitiative = (): void => {
    const snapshot = serializeState({ currentStep, projectData });
    const timestamp = new Date().toISOString().replaceAll(":", "-");
    downloadFile(`initiative-copy-${timestamp}.json`, snapshot, "application/json");
  };

  const copyCurrentSection = async (): Promise<void> => {
    const sectionText = getStepValue(currentStep, projectData);
    if (!sectionText.trim()) return;
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(sectionText);
  };

  const jumpToNextIncomplete = (): void => {
    if (nextIncompleteStep) {
      setCurrentStep(nextIncompleteStep);
      setActiveTab("workflow");
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!event.altKey) return;
      if (event.key === "ArrowLeft") {
        setCurrentStep(currentStep - 1);
      }
      if (event.key === "ArrowRight") {
        setCurrentStep(currentStep + 1);
      }
      if (event.key.toLowerCase() === "j") {
        jumpToNextIncomplete();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentStep, nextIncompleteStep, setCurrentStep]);

  useEffect(() => {
    const onWindowClick = (): void => {
      setIsFileMenuOpen(false);
    };
    window.addEventListener("click", onWindowClick);
    return () => window.removeEventListener("click", onWindowClick);
  }, []);

  const briefingMarkdown = createExecutiveBrief();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-title">{profile.appName}</div>
        <div className="sidebar-subtitle">Talent Intelligence Workspace</div>
        <div className="sidebar-phase-row">
          {Array.from(new Set(STEPS.map((step) => step.phase))).map((phase) => (
            <span key={phase} className="phase-chip">
              {phase}
            </span>
          ))}
        </div>
        <div className="sidebar-steps">
          {STEPS.map((step) => (
            <button
              key={step.id}
              className={`step-button ${step.id === currentStep ? "active" : ""}`}
              onClick={() => setCurrentStep(step.id)}
              disabled={!canAccessStep(step.id)}
              title={!canAccessStep(step.id) ? "Complete previous step first" : "Open step"}
            >
              <div className="step-topline">
                <span className="step-title-text">
                  {step.id}. {step.title}
                </span>
                <span className="step-status-chip">{completedSteps.has(step.id) ? "Done" : ""}</span>
              </div>
              <div className="step-goal">{step.goal}</div>
            </button>
          ))}
        </div>
        <div className="sidebar-signature">
          <Image src="/assets/logo-rgd.png" alt="R.G. Development" width={56} height={28} />
          <span>Engineered by R.G. Development</span>
        </div>
      </aside>

      <main className="main">
        <header className="header">
          <div className="header-title-wrap">
            <h1 className="header-title">{currentStepDefinition.title}</h1>
            <div className="header-subtitle">
              {currentStepDefinition.phase} | {currentStepDefinition.goal}
            </div>
            <div className="header-subtitle">
              Integration profile: {profile.appId}
            </div>
          </div>
          <div className="header-actions">
            <div className="menu-wrap">
              <button
                className="btn secondary"
                aria-haspopup="menu"
                aria-expanded={isFileMenuOpen}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsFileMenuOpen((current) => !current);
                }}
              >
                File
              </button>
              {isFileMenuOpen ? (
                <div className="menu-dropdown" role="menu" onClick={(event) => event.stopPropagation()}>
                  <button
                    data-testid="export-json"
                    className="menu-item"
                    role="menuitem"
                    onClick={() =>
                      downloadFile(
                        "pitch-architect-export.json",
                        serializeState({ currentStep, projectData }),
                        "application/json"
                      )
                    }
                  >
                    Export JSON
                  </button>
                  <button
                    data-testid="export-md"
                    className="menu-item"
                    role="menuitem"
                    onClick={() => downloadFile("pitch-architect-report.md", toMarkdownExport(projectData), "text/markdown")}
                  >
                    Export Markdown
                  </button>
                  <label data-testid="import-json" className="menu-item menu-file-input" role="menuitem">
                    Import JSON
                    <input
                      type="file"
                      accept=".json,application/json"
                      style={{ display: "none" }}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) importState(file);
                        setIsFileMenuOpen(false);
                      }}
                    />
                  </label>
                  <button className="menu-item" role="menuitem" onClick={duplicateInitiative}>
                    Duplicate Initiative
                  </button>
                  <button className="menu-item" role="menuitem" onClick={clearCurrentStep}>
                    Reset Current Step
                  </button>
                  <button className="menu-item danger" role="menuitem" onClick={resetAll}>
                    Reset Session
                  </button>
                </div>
              ) : null}
            </div>
            <button className="btn ghost" onClick={jumpToNextIncomplete} disabled={!nextIncompleteStep}>
              Jump To Next Incomplete
            </button>
            <button className="btn secondary" onClick={() => setCurrentStep(currentStep - 1)} disabled={currentStep <= 1}>
              Back
            </button>
            <button className="btn secondary" onClick={() => setCurrentStep(currentStep + 1)} disabled={currentStep >= 8}>
              Next
            </button>
          </div>
        </header>

        <section className="workspace">
          <div className="tab-row" role="tablist" aria-label="Workspace views">
            <button
              role="tab"
              aria-selected={activeTab === "workflow"}
              className={`tab-button ${activeTab === "workflow" ? "active" : ""}`}
              onClick={() => setActiveTab("workflow")}
            >
              Workflow
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "insights"}
              className={`tab-button ${activeTab === "insights" ? "active" : ""}`}
              onClick={() => setActiveTab("insights")}
            >
              Insights
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "briefing"}
              className={`tab-button ${activeTab === "briefing" ? "active" : ""}`}
              onClick={() => setActiveTab("briefing")}
            >
              Executive Brief
            </button>
          </div>

          {geminiResource.error ? <div className="status-error">{geminiResource.error}</div> : null}
          <div className="workspace-grid">
            <div>
              <div className="card trust-strip">
                <div className="trust-item">
                  <div className="trust-label">Input Scope</div>
                  <strong>{Math.max(projectData.rawPitch.length, projectData.refinedPitch.length)} chars captured</strong>
                </div>
                <div className="trust-item">
                  <div className="trust-label">Generation Time</div>
                  <strong>{lastGeneratedAtByStep[currentStep] ?? "Not generated yet"}</strong>
                </div>
                <div className="trust-item">
                  <div className="trust-label">Review Status</div>
                  <strong>{confidenceLabel}</strong>
                </div>
              </div>

              {activeTab === "workflow" && (
                <>
                  {currentStep === 1 ? (
                    <div className="stack">
                      <div className="card hero-card">
                        <h3>Initiative Conversation</h3>
                        <p className="card-helper">
                          Capture the internal project context, goals, and constraints in Talent/HR language.
                        </p>
                        <div className="conversation-log">
                          {projectData.chatHistory.map((item, index) => (
                            <div key={`${item.role}-${index}`} className="conversation-item">
                              <strong>{item.role}:</strong> {item.content}
                            </div>
                          ))}
                        </div>
                        <textarea
                          data-testid="pitch-input"
                          className="textarea"
                          placeholder="Describe the initiative, who it serves, and what change you need."
                          value={chatInput}
                          onChange={(event) => setChatInput(event.target.value)}
                        />
                        <div className="card-action-row">
                          <button
                            data-testid="pitch-submit"
                            className="btn primary"
                            onClick={onChatSend}
                            disabled={geminiResource.loading}
                          >
                            {geminiResource.loading ? "Thinking..." : "Refine Initiative"}
                          </button>
                        </div>
                      </div>
                      <div className="card">
                        <h3>Refined Initiative Brief</h3>
                        <div
                          dangerouslySetInnerHTML={{ __html: marked.parse(projectData.refinedPitch || "_No brief yet_") }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="card">
                      <div className="card-header">
                        <div>
                          <h3>{currentStepDefinition.title}</h3>
                          <p className="card-helper">{currentStepDefinition.goal}</p>
                        </div>
                        <button
                          className="btn primary"
                          onClick={() => void runStep(currentStep)}
                          disabled={geminiResource.loading}
                        >
                          {geminiResource.loading ? "Generating..." : "Generate Output"}
                        </button>
                      </div>
                      <div className="card-content">
                        {currentStep === 2 && (
                          <div dangerouslySetInnerHTML={{ __html: marked.parse(projectData.businessModel || "_No content yet_") }} />
                        )}
                        {currentStep === 3 && (
                          <div dangerouslySetInnerHTML={{ __html: marked.parse(projectData.ecosystem || "_No content yet_") }} />
                        )}
                        {currentStep === 4 && (
                          <div dangerouslySetInnerHTML={{ __html: marked.parse(projectData.personas || "_No content yet_") }} />
                        )}
                        {currentStep === 5 && (
                          <div dangerouslySetInnerHTML={{ __html: marked.parse(projectData.gapAnalysis || "_No content yet_") }} />
                        )}
                        {currentStep === 6 && (
                          <pre>{projectData.marketParams ? JSON.stringify(projectData.marketParams, null, 2) : "No simulation data yet."}</pre>
                        )}
                        {currentStep === 7 && (
                          <div dangerouslySetInnerHTML={{ __html: marked.parse(projectData.deckPrompts || "_No content yet_") }} />
                        )}
                        {currentStep === 8 && (
                          <div dangerouslySetInnerHTML={{ __html: marked.parse(projectData.portalPrompt || "_No content yet_") }} />
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeTab === "insights" && (
                <div className="card">
                  <h3>Initiative Insights</h3>
                  <p className="card-helper">Scan completed outputs quickly and jump back to improve quality.</p>
                  <div className="insights-grid">
                    {STEPS.map((step) => (
                      <button
                        key={step.id}
                        className="insight-card"
                        disabled={!canAccessStep(step.id)}
                        onClick={() => {
                          setCurrentStep(step.id);
                          setActiveTab("workflow");
                        }}
                      >
                        <strong>
                          {step.id}. {step.title}
                        </strong>
                        <span>{completedSteps.has(step.id) ? "Ready" : "Incomplete"}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "briefing" && (
                <div className="card">
                  <h3>Executive Briefing Draft</h3>
                  <p className="card-helper">Use this for leadership alignment before final exports.</p>
                  <div dangerouslySetInnerHTML={{ __html: marked.parse(briefingMarkdown) }} />
                </div>
              )}
            </div>

            <aside className="summary-rail">
              <div className="card summary-rail-card">
                <h3>Session Summary</h3>
                <div className="summary-metric">
                  <span>Completion</span>
                  <strong>{confidenceScore}%</strong>
                </div>
                <div className="summary-progress">
                  <div style={{ width: `${confidenceScore}%` }} />
                </div>
                <div className="summary-metric">
                  <span>Next Focus</span>
                  <strong>
                    {nextIncompleteStep
                      ? `${nextIncompleteStep}. ${STEPS.find((step) => step.id === nextIncompleteStep)?.title ?? "Pending"}`
                      : "All steps complete"}
                  </strong>
                </div>
                <div className="card-action-row">
                  <button className="btn secondary" onClick={() => void copyCurrentSection()}>
                    Copy Current Section
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}
