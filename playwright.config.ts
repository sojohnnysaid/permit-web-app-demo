import { defineConfig } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://tops.sogos.io';

export default defineConfig({
	testDir: './tests',
	timeout: 30000,
	outputDir: './tests/results',
	use: {
		baseURL,
		screenshot: 'on',
		trace: 'on'
	},
	projects: [
		{
			name: 'chromium',
			use: { browserName: 'chromium' }
		}
	]
});
