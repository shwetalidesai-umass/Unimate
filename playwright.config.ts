import { defineConfig, devices } from '@playwright/test';

const FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT || 3000);
const BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT || 4000);

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/playwright-junit.xml' }],
  ],
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      // Bring up Postgres via docker-compose, then start the API pointed at it.
      command: `cd server && docker compose up -d db && NODE_ENV=test PORT=${BACKEND_PORT} CLIENT_URL=http://localhost:${FRONTEND_PORT} JWT_SECRET=e2e-secret DB_HOST=127.0.0.1 DB_PORT=5433 DB_NAME=unimate DB_USER=unimate DB_PASSWORD=unimate node server.js`,
      url: `http://localhost:${BACKEND_PORT}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      // Run CRA on a non-conflicting port; it proxies API calls to backend (4000) via client/package.json "proxy".
      command: `cd client && PORT=${FRONTEND_PORT} BROWSER=none npm start`,
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});

