import { test, expect } from '@playwright/test';

test('debug: load root page and capture console errors', async ({ page }) => {
	const errors: string[] = [];
	const consoleMessages: string[] = [];

	page.on('console', (msg) => {
		consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
	});

	page.on('pageerror', (err) => {
		errors.push(err.message);
	});

	page.on('requestfailed', (req) => {
		errors.push(`FAILED: ${req.url()} - ${req.failure()?.errorText}`);
	});

	await page.goto('/', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
	await page.screenshot({ path: 'tests/screenshots/01-root-page.png', fullPage: true });

	// Log all errors and console messages
	console.log('=== CONSOLE MESSAGES ===');
	consoleMessages.forEach((m) => console.log(m));
	console.log('=== PAGE ERRORS ===');
	errors.forEach((e) => console.log(e));
	console.log('=== CURRENT URL ===');
	console.log(page.url());
});

test('debug: go directly to /login', async ({ page }) => {
	const errors: string[] = [];

	page.on('pageerror', (err) => {
		errors.push(err.message);
	});

	page.on('requestfailed', (req) => {
		errors.push(`FAILED: ${req.url()} - ${req.failure()?.errorText}`);
	});

	await page.goto('/login', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
	await page.screenshot({ path: 'tests/screenshots/02-login-page.png', fullPage: true });

	console.log('=== ERRORS on /login ===');
	errors.forEach((e) => console.log(e));
	console.log('=== CURRENT URL ===');
	console.log(page.url());
	console.log('=== PAGE TITLE ===');
	console.log(await page.title());
});

test('debug: login flow with admin/password', async ({ page }) => {
	const errors: string[] = [];

	page.on('pageerror', (err) => {
		errors.push(err.message);
	});

	page.on('requestfailed', (req) => {
		errors.push(`FAILED: ${req.url()} - ${req.failure()?.errorText}`);
	});

	await page.goto('/login', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
	await page.screenshot({ path: 'tests/screenshots/03-before-login.png', fullPage: true });

	// Try to find and fill login form
	const usernameInput = page.locator('input[type="text"], input[name="username"], input[placeholder*="user" i]').first();
	const passwordInput = page.locator('input[type="password"]').first();

	const hasUsername = await usernameInput.isVisible().catch(() => false);
	const hasPassword = await passwordInput.isVisible().catch(() => false);

	console.log(`Username input visible: ${hasUsername}`);
	console.log(`Password input visible: ${hasPassword}`);

	if (hasUsername && hasPassword) {
		await usernameInput.fill('admin');
		await passwordInput.fill('password');
		await page.screenshot({ path: 'tests/screenshots/04-filled-form.png', fullPage: true });

		const submitButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In"), button:has-text("Login")').first();
		await submitButton.click();

		await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {});
		await page.screenshot({ path: 'tests/screenshots/05-after-login.png', fullPage: true });

		console.log('=== AFTER LOGIN URL ===');
		console.log(page.url());
	} else {
		console.log('=== LOGIN FORM NOT FOUND ===');
		console.log('Page HTML (first 2000 chars):');
		const html = await page.content();
		console.log(html.substring(0, 2000));
	}

	console.log('=== ALL ERRORS ===');
	errors.forEach((e) => console.log(e));
});
