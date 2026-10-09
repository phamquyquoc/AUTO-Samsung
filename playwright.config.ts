import { defineConfig } from '@playwright/test';

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

// capture() shells out to screenshot-desktop's screenCapture_1.3.2.bat, which resolves its .exe
// from the batch file's own folder. With this var set, that lookup fails and every capture()
// throws "Command failed: ... screenCapture_1.3.2.bat /list". The config loads in the runner and
// in each worker, so clearing it here covers CLI runs and the VS Code extension alike.
delete process.env.NoDefaultCurrentDirectoryInExePath;

export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. */
  reporter: 'html',
  /* Shared settings for all the projects below. */
  use: {
    headless: false,
    screenshot: 'on',
    // retries are 0 locally, so on-first-retry never produced a trace for a plain failure
    trace: 'retain-on-failure',
    // Playwright's default is 0 (unbounded), so a single click on a stalled page eats the whole
    // 300s test timeout and reports "Test timeout exceeded" instead of naming the locator.
    actionTimeout: 20000,
    userAgent: 'D2CEST-AUTO-70a4cf16 Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36.D2CEST-AUTO-70a4cf16',
    viewport: null,
    // Pin what the OS would otherwise decide, so a run means the same thing on every machine.
    // The sites pick their language from the URL path, not Accept-Language.
    locale: 'en-US',
    timezoneId: 'Asia/Seoul',
    launchOptions: { args: ['--start-maximized'] }
  },
  timeout: 300000,

  /* Configure projects */
  projects: [
    {
      name: 'Core',
      testDir: 'tests'
    },
    {
      name: 'Regression',
      testDir: 'regression',
      use: {
        contextOptions: {
          permissions: ['clipboard-read', 'clipboard-write'],
        }
      },
    }
  ],
});
