"use client";

import { useMemo, useState } from "react";
import { marked } from "marked";
import { STEPS } from "@/lib/core/steps";
import { toMarkdownExport, serializeState, parseState } from "@/lib/persistence/storage";
import { useProfile } from "@/hooks/useProfile";
import { useProjectState } from "@/hooks/useProjectState";
import { useResources } from "@/hooks/useResources";
import { initialProjectData, type MarketParams } from "@/types/project";

interface GeminiPayload {
  step: number;
  userInput?: string;
  projectData: typeof initialProjectData;
}

interface GeminiResponse {
  text: string;
}

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

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-title">{profile.appName}</div>
        <div style={{ padding: "0.5rem" }}>
          {STEPS.map((step) => (
            <button
              key={step.id}
              className={`step-button ${step.id === currentStep ? "active" : ""}`}
              onClick={() => setCurrentStep(step.id)}
              disabled={!canAccessStep(step.id)}
              title={!canAccessStep(step.id) ? "Complete previous step first" : "Open step"}
            >
              {step.id}. {step.title} {completedSteps.has(step.id) ? " - done" : ""}
            </button>
          ))}
        </div>
      </aside>

      <main className="main">
        <header className="header">
          <div>
            <strong>{currentStepDefinition.title}</strong>
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Standalone mode ready | Integration profile: {profile.appId}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn secondary" onClick={() => setCurrentStep(currentStep - 1)} disabled={currentStep <= 1}>
              Back
            </button>
            <button className="btn secondary" onClick={() => setCurrentStep(currentStep + 1)} disabled={currentStep >= 8}>
              Next
            </button>
          </div>
        </header>

        <section className="workspace">
          {geminiResource.error ? <div className="status-error">{geminiResource.error}</div> : null}

          {currentStep === 1 ? (
            <div className="split">
              <div className="card">
                <h3>Conversation</h3>
                <div style={{ maxHeight: "350px", overflow: "auto", marginBottom: "0.7rem" }}>
                  {projectData.chatHistory.map((item, index) => (
                    <div key={`${item.role}-${index}`} style={{ marginBottom: "0.5rem" }}>
                      <strong>{item.role}:</strong> {item.content}
                    </div>
                  ))}
                </div>
                <textarea
                  data-testid="pitch-input"
                  className="textarea"
                  placeholder="Describe your idea and what problem it solves."
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                />
                <div style={{ marginTop: "0.7rem" }}>
                  <button data-testid="pitch-submit" className="btn primary" onClick={onChatSend} disabled={geminiResource.loading}>
                    {geminiResource.loading ? "Thinking..." : "Send"}
                  </button>
                </div>
              </div>
              <div className="card">
                <h3>Refined Pitch</h3>
                <div
                  dangerouslySetInnerHTML={{ __html: marked.parse(projectData.refinedPitch || "_No pitch yet_") }}
                />
              </div>
            </div>
          ) : (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3>{currentStepDefinition.title}</h3>
                <button className="btn success" onClick={() => void runStep(currentStep)} disabled={geminiResource.loading}>
                  {geminiResource.loading ? "Generating..." : "Generate"}
                </button>
              </div>
              <div style={{ marginTop: "0.8rem" }}>
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

          <div className="card" style={{ marginTop: "1rem" }}>
            <h3>Persistence and Portability</h3>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.6rem" }}>
              <button
                data-testid="export-json"
                className="btn secondary"
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
                className="btn secondary"
                onClick={() =>
                  downloadFile("pitch-architect-report.md", toMarkdownExport(projectData), "text/markdown")
                }
              >
                Export Markdown
              </button>
              <label data-testid="import-json" className="btn secondary">
                Import JSON
                <input
                  type="file"
                  accept=".json,application/json"
                  style={{ display: "none" }}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) importState(file);
                  }}
                />
              </label>
              <button className="btn secondary" onClick={resetAll}>
                Reset Session
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
