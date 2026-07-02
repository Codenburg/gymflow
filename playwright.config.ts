import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  testIgnore: [
    '**/admin-e2e.spec.ts',
    '**/feriados-crud.spec.ts',
    '**/promocion-e2e.spec.ts',
    '**/promociones-descuentos.spec.ts',
    '**/rutinas.spec.ts',
    '**/security-admin.spec.ts',
  ],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'line',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:3000/admin/login',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
