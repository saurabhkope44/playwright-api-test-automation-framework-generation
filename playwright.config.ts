import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './Tests',
  timeout: 45000,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'Reports/html-report', open: 'never' }]
  ],
  use: {
    extraHTTPHeaders: {
      'Content-Type': 'application/json'
    },
    ignoreHTTPSErrors: true
  }
});
