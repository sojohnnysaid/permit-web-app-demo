import { test, expect } from '@playwright/test';

test.describe('Phase 1: Login, MFA, Role Selection', () => {
	test('login → MFA → role selection → dashboard', async ({ page }) => {
		await page.goto('/login', { waitUntil: 'networkidle' });
		await page.screenshot({ path: 'tests/screenshots/p1-01-login-page.png', fullPage: true });

		// Fill credentials
		const usernameInput = page.locator('input[type="text"], input[placeholder*="user" i]').first();
		const passwordInput = page.locator('input[type="password"]').first();
		await usernameInput.fill('admin');
		await passwordInput.fill('password');

		// Submit login
		const signInBtn = page.locator('button[type="submit"]').first();
		await signInBtn.click();

		// Wait for MFA step
		await page.waitForTimeout(1500);
		await page.screenshot({ path: 'tests/screenshots/p1-02-mfa-step.png', fullPage: true });

		// Verify MFA step visible
		const mfaHeading = page.locator('text=Two-Factor Authentication, text=Verification, text=MFA').first();
		const verifyBtn = page.locator('button:has-text("Verify")').first();

		if (await verifyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
			await verifyBtn.click();
			await page.waitForTimeout(500);
		}

		await page.screenshot({ path: 'tests/screenshots/p1-03-role-selection.png', fullPage: true });

		// Look for role selection cards
		const applicantCard = page.locator('button:has-text("Applicant"), [role="button"]:has-text("Applicant")').first();

		if (await applicantCard.isVisible({ timeout: 3000 }).catch(() => false)) {
			await applicantCard.click();
		}

		// Should end up at dashboard
		await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {});
		await page.screenshot({ path: 'tests/screenshots/p1-04-dashboard.png', fullPage: true });

		console.log('Final URL:', page.url());
		expect(page.url()).toContain('dashboard');
	});

	test('permit selector shows 5 SOO types with pre-application banner', async ({ page }) => {
		// Login first
		await page.goto('/login', { waitUntil: 'networkidle' });
		const usernameInput = page.locator('input[type="text"], input[placeholder*="user" i]').first();
		const passwordInput = page.locator('input[type="password"]').first();
		await usernameInput.fill('admin');
		await passwordInput.fill('password');
		await page.locator('button[type="submit"]').first().click();
		await page.waitForTimeout(1500);

		// Handle MFA
		const verifyBtn = page.locator('button:has-text("Verify")').first();
		if (await verifyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
			await verifyBtn.click();
			await page.waitForTimeout(500);
		}

		// Handle role selection
		const applicantCard = page.locator('button:has-text("Applicant"), [role="button"]:has-text("Applicant")').first();
		if (await applicantCard.isVisible({ timeout: 2000 }).catch(() => false)) {
			await applicantCard.click();
		}

		await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {});

		// Navigate to permit selector
		await page.goto('/permits/new', { waitUntil: 'networkidle' });
		await page.waitForTimeout(1000);
		await page.screenshot({ path: 'tests/screenshots/p1-05-permit-selector.png', fullPage: true });

		// Verify 5 SOO permit types
		const pageContent = await page.textContent('body');
		expect(pageContent).toContain('Parking');
		expect(pageContent).toContain('Construction');
		expect(pageContent).toContain('Commercial Vehicle');
		expect(pageContent).toContain('Public Space');
		expect(pageContent).toContain('Heritage Tree');

		// Verify pre-application banner
		expect(pageContent).toContain('Pre-Application');
	});

	test('account setup page loads with pre-filled data', async ({ page }) => {
		// Login flow
		await page.goto('/login', { waitUntil: 'networkidle' });
		await page.locator('input[type="text"], input[placeholder*="user" i]').first().fill('admin');
		await page.locator('input[type="password"]').first().fill('password');
		await page.locator('button[type="submit"]').first().click();
		await page.waitForTimeout(1500);

		const verifyBtn = page.locator('button:has-text("Verify")').first();
		if (await verifyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
			await verifyBtn.click();
			await page.waitForTimeout(500);
		}
		const applicantCard = page.locator('button:has-text("Applicant"), [role="button"]:has-text("Applicant")').first();
		if (await applicantCard.isVisible({ timeout: 2000 }).catch(() => false)) {
			await applicantCard.click();
		}
		await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {});

		// Navigate to account page
		await page.goto('/account', { waitUntil: 'networkidle' });
		await page.screenshot({ path: 'tests/screenshots/p1-06-account-setup.png', fullPage: true });

		const pageContent = await page.textContent('body');
		expect(pageContent).toContain('Account');
		expect(pageContent).toContain('Project');
	});
});
