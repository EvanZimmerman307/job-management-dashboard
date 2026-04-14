import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
  },
  retries: 0,
  timeout: 30_000,
  reporter: [["list"], ["html", { open: "never" }]],
});
