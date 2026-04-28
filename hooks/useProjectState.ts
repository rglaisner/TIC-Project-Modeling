"use client";

import { useEffect, useMemo, useState } from "react";
import { PERSISTENCE_KEY, parseState, serializeState } from "@/lib/persistence/storage";
import { STEPS } from "@/lib/core/steps";
import { initialProjectData, type ProjectData } from "@/types/project";

interface UseProjectStateReturn {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  projectData: ProjectData;
  setProjectData: React.Dispatch<React.SetStateAction<ProjectData>>;
  completedSteps: Set<number>;
  canAccessStep: (step: number) => boolean;
  resetAll: () => void;
}

export function useProjectState(): UseProjectStateReturn {
  const [currentStep, setCurrentStepState] = useState<number>(1);
  const [projectData, setProjectData] = useState<ProjectData>(initialProjectData);

  useEffect(() => {
    const raw = window.localStorage.getItem(PERSISTENCE_KEY);
    if (!raw) return;
    const parsed = parseState(raw);
    if (!parsed) return;
    setCurrentStepState(parsed.currentStep);
    setProjectData(parsed.projectData);
  }, []);

  useEffect(() => {
    const serialized = serializeState({ currentStep, projectData });
    window.localStorage.setItem(PERSISTENCE_KEY, serialized);
  }, [currentStep, projectData]);

  const completedSteps = useMemo(() => {
    const completed = new Set<number>();
    STEPS.forEach((step) => {
      const value = projectData[step.key as keyof ProjectData];
      const hasValue =
        typeof value === "string"
          ? value.trim().length > 0
          : value !== null && value !== undefined;
      if (hasValue) {
        completed.add(step.id);
      }
    });
    return completed;
  }, [projectData]);

  const canAccessStep = (stepId: number): boolean => {
    const step = STEPS.find((item) => item.id === stepId);
    if (!step) return false;
    return step.requiredKeys.every((key) => {
      const value = projectData[key as keyof ProjectData];
      if (typeof value === "string") {
        return value.trim().length > 0;
      }
      return value !== null && value !== undefined;
    });
  };

  const setCurrentStep = (step: number): void => {
    setCurrentStepState(Math.max(1, Math.min(STEPS.length, step)));
  };

  const resetAll = (): void => {
    setCurrentStepState(1);
    setProjectData(initialProjectData);
    window.localStorage.removeItem(PERSISTENCE_KEY);
  };

  return {
    currentStep,
    setCurrentStep,
    projectData,
    setProjectData,
    completedSteps,
    canAccessStep,
    resetAll,
  };
}
