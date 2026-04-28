"use client";

import { useMemo } from "react";

export interface AppProfile {
  appId: string;
  appName: string;
  version: string;
  supportsEmbed: boolean;
}

export function useProfile(): AppProfile {
  return useMemo(
    () => ({
      appId: "pitch-architect",
      appName: "Strategic Pitch Architect",
      version: "2.0.0",
      supportsEmbed: true,
    }),
    []
  );
}
