import { defineConfig } from '@playwright/test';

const baseURL = process.env.BASE_URL;

export default defineConfig({
	...(baseURL
		? { use: { baseURL } }
		: { webServer: { command: 'npm run build && npm run preview', port: 4173 } }),
	testDir: 'e2e'
});
