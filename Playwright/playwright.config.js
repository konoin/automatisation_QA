import { defineConfig } from '@playwright/test';

export default defineConfig({
  timeout: 30000,
  retries: 1,
  use: {
    headless: false,
    permissions: ['clipboard-read', 'clipboard-write'],
    launchOptions: {
      args: [
        '--disable-web-security',
        '--enable-features=Clipboard'
    ],
    },
  },
});