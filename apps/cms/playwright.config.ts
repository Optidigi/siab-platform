import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3001",
    ...(process.env.E2E_HOST_HEADER
      ? { extraHTTPHeaders: { Host: process.env.E2E_HOST_HEADER } }
      : {}),
    ...(process.env.E2E_HOST_RESOLVER_RULES
      ? { launchOptions: { args: [`--host-resolver-rules=${process.env.E2E_HOST_RESOLVER_RULES}`] } }
      : {}),
    trace: "on-first-retry",
    actionTimeout: 10_000,
    navigationTimeout: 20_000
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  workers: 1,
  // Don't auto-start the dev server — the user already has one running on 3001
  // (background task throughout this build). If you want isolated runs later,
  // configure webServer here.
  reporter: [["list"], ["html", { open: "never" }]],
  fullyParallel: false  // share dev DB; serial for safety
})
