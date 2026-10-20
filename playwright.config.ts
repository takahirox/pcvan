import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Existing functional journeys use the accessible Instant default; renderer tests
  // explicitly opt into animation and drive controlled frames.
  use: { baseURL: 'http://127.0.0.1:14373', reducedMotion: 'reduce' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [{
    command: 'npm run build && npm run preview -- --port 14373 --strictPort',
    url: 'http://127.0.0.1:14373',
    reuseExistingServer: false,
  }, {
    // Repository tests import the TypeScript module into a real browser via Vite.
    command: 'npm run dev -- --port 14374 --strictPort',
    url: 'http://127.0.0.1:14374',
    reuseExistingServer: false,
  }],
});
