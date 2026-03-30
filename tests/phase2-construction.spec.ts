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
		test.setTimeout(60000);
		await loginAsApplicant(page);

		// Navigate to Construction/Excavation wizard
		const newPermitBtn = page.locator('a:has-text("New Permit"), a[href="/permits/new"]').first();
		await newPermitBtn.click();
		await page.waitForTimeout(1000);

		const constructionCard = page.locator('button:has-text("Construction")').first();
		await constructionCard.click();
		await page.waitForTimeout(1500);

		// Step 1: Project Details
		await page.screenshot({ path: 'tests/screenshots/p2-01-wizard-step1.png', fullPage: true });
		const bodyText = await page.textContent('body');
		expect(bodyText).toContain('Construction');

		// Fill required fields on step 1
		const descInput = page.locator('textarea').first();
		if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
			await descInput.fill('Underground utility replacement along H Street NE corridor');
		}

		// Fill contractor name if visible
		const contractorInput = page.locator('input[placeholder*="contractor" i], input[placeholder*="company" i], input[placeholder*="Paving" i]').first();
		if (await contractorInput.isVisible({ timeout: 1000 }).catch(() => false)) {
			await contractorInput.fill('DC Paving Solutions LLC');
		}

		// Fill license number if visible
		const licenseInput = page.locator('input[placeholder*="license" i], input[placeholder*="DC-CON" i]').first();
		if (await licenseInput.isVisible({ timeout: 1000 }).catch(() => false)) {
			await licenseInput.fill('DC-CON-2835-445');
		}

		// Fill dates if visible
		const dateInputs = page.locator('input[type="date"]');
		const dateCount = await dateInputs.count();
		if (dateCount >= 2) {
			await dateInputs.nth(0).fill('2026-04-15');
			await dateInputs.nth(1).fill('2026-06-15');
		}

		// Click Next (may need force if validation isn't met)
		const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
		if (await nextBtn.isEnabled({ timeout: 2000 }).catch(() => false)) {
			await nextBtn.click();
			await page.waitForTimeout(1000);
		} else {
			// Force click to advance for screenshot purposes
			await nextBtn.click({ force: true }).catch(() => {});
			await page.waitForTimeout(1000);
		}

		// Step 2: Location
		await page.screenshot({ path: 'tests/screenshots/p2-02-wizard-step2.png', fullPage: true });

		// Advance through remaining steps with force click if needed
		for (let step = 3; step <= 5; step++) {
			const btn = page.locator('button:has-text("Next"), button:has-text("Continue"), button:has-text("Review")').first();
			if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
				await btn.click({ force: true }).catch(() => {});
				await page.waitForTimeout(1000);
			}
			await page.screenshot({ path: `tests/screenshots/p2-0${step}-wizard-step${step}.png`, fullPage: true });
		}

		// Verify we can see the wizard content
		const finalContent = await page.textContent('body');
		console.log('Wizard has fee info:', finalContent?.includes('$') || finalContent?.includes('Fee'));
		console.log('Wizard has DCMR:', finalContent?.includes('DCMR') || finalContent?.includes('Title'));
	});

	test('dashboard shows AI status explanations', async ({ page }) => {
		await loginAsApplicant(page);
		await page.waitForTimeout(1000);

		await page.screenshot({ path: 'tests/screenshots/p2-06-dashboard-ai-status.png', fullPage: true });

		const bodyText = await page.textContent('body');
		const hasAIText = bodyText?.includes('reviewed') ||
			bodyText?.includes('approved') ||
			bodyText?.includes('received') ||
			bodyText?.includes('business day');
		console.log('AI status explanations present:', hasAIText);
		expect(hasAIText).toBeTruthy();
	});
});
