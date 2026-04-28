import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    appId: "pitch-architect",
    appName: "Strategic Pitch Architect",
    version: "2.0.0",
    mode: "standalone-first",
    capabilities: {
      embedReady: true,
      importExport: true,
      passcodeGate: true,
      aiProvider: "gemini-proxy",
    },
    routes: {
      home: "/",
      access: "/access",
      metadata: "/api/app-meta",
      health: "/api/health",
    },
  });
}
