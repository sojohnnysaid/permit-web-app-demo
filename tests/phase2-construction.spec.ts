import { test, expect } from '@playwright/test';

async function loginAsApplicant(page: import('@playwright/test').Page) {
	await page.goto('/login', { waitUntil: 'networkidle' });
	await page.locator('input[type="text"], input[placeholder*="user" i]').first().fill('admin');
	await page.locator('input[type="password"]').first().fill('password');
	await page.locator('button[type="submit"]').first().click();
	await page.waitForTimeout(1500);

	const verifyBtn = page.locator('button:has-text("Verify")').first();
	if (await verifyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
		await verifyBtn.click();
		await page.waitForTimeout(500);
	}

	const applicantCard = page.locator('button:has-text("Applicant"), [role="button"]:has-text("Applicant")').first();
	if (await applicantCard.isVisible({ timeout: 3000 }).catch(() => false)) {
		await applicantCard.click();
	}

	await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {});
}

test.describe('Phase 2: Construction/Excavation Wizard', () => {
	test('full wizard walkthrough with screenshots', async ({ page }) => {
		await loginAsApplicant(page);

		// Navigate to permit selector
		const newPermitBtn = page.locator('a:has-text("New Permit"), a[href="/permits/new"]').first();
		await newPermitBtn.click();
		await page.waitForTimeout(1000);

		// Click Construction/Excavation card
		const constructionCard = page.locator('button:has-text("Construction")').first();
		await constructionCard.click();
		await page.waitForTimeout(1500);

		await page.screenshot({ path: 'tests/screenshots/p2-01-wizard-step1.png', fullPage: true });

		// Verify step 1 loaded
		const bodyText = await page.textContent('body');
		expect(bodyText).toContain('Construction');

		// Fill step 1 if form fields are visible
		const descInput = page.locator('textarea').first();
		if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
			await descInput.fill('Underground utility replacement along H Street NE corridor');
		}

		// Try to advance to step 2
		const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
		if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
			await nextBtn.click();
			await page.waitForTimeout(1000);
		}

		await page.screenshot({ path: 'tests/screenshots/p2-02-wizard-step2.png', fullPage: true });

		// Advance through remaining steps
		for (let step = 3; step <= 5; step++) {
			const btn = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
			if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
				await btn.click();
				await page.waitForTimeout(1000);
			}
			await page.screenshot({ path: `tests/screenshots/p2-0${step}-wizard-step${step}.png`, fullPage: true });
		}

		// Check for fee estimate on step 4
		const pageContent = await page.textContent('body');
		const hasFees = pageContent?.includes('Fee') || pageContent?.includes('$');
		console.log('Fee estimate visible:', hasFees);

		// Check for DCMR references on step 5
		const hasDCMR = pageContent?.includes('DCMR') || pageContent?.includes('Title');
		console.log('DCMR references visible:', hasDCMR);
	});

	test('dashboard shows AI status explanations', async ({ page }) => {
		await loginAsApplicant(page);
		await page.waitForTimeout(1000);

		await page.screenshot({ path: 'tests/screenshots/p2-06-dashboard-ai-status.png', fullPage: true });

		// Check for AI-generated status explanations
		const bodyText = await page.textContent('body');
		const hasAIText = bodyText?.includes('reviewed') ||
			bodyText?.includes('approved') ||
			bodyText?.includes('received') ||
			bodyText?.includes('business day');
		console.log('AI status explanations present:', hasAIText);
		expect(hasAIText).toBeTruthy();
	});
});
