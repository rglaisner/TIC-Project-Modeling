import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
  },
  webServer: {
    command: "npm run dev",
    port: 3000,
    timeout: 120000,
    reuseExistingServer: true,
    env: {
      GEMINI_API_KEY: "test-key",
      APP_ACCESS_PASSCODE: "test-passcode",
      SESSION_SECRET: "test-session-secret",
    },
  },
});
