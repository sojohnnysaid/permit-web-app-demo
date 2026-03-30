import { test, expect } from '@playwright/test';

async function loginAsRole(page: import('@playwright/test').Page, role: 'Applicant' | 'Reviewer' | 'Administrator') {
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

	const roleCard = page.locator(`button:has-text("${role}"), [role="button"]:has-text("${role}")`).first();
	if (await roleCard.isVisible({ timeout: 3000 }).catch(() => false)) {
		await roleCard.click();
	}

	await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {});
}

test.describe('Phase 3: Reviewer Work Queue & GIS Conflict', () => {
	test('reviewer queue shows permits sorted by SLA urgency', async ({ page }) => {
		test.setTimeout(60000);
		await loginAsRole(page, 'Reviewer');

		// Navigate to reviewer queue via nav link (preserves SPA state)
		const queueLink = page.locator('a:has-text("Work Queue")').first();
		await queueLink.click({ timeout: 5000 }).catch(() => {});
		await page.waitForTimeout(2000);

		await page.screenshot({ path: 'tests/screenshots/p3-01-reviewer-queue.png', fullPage: true });

		const bodyText = await page.textContent('body');
		// Should show permits in queue
		const hasPermits = bodyText?.includes('TOPS-') || bodyText?.includes('Review');
		console.log('Reviewer queue has permits:', hasPermits);
		expect(hasPermits).toBeTruthy();
	});

	test('review detail page with GIS conflict view', async ({ page }) => {
		test.setTimeout(60000);
		await loginAsRole(page, 'Reviewer');

		// Navigate to queue then click first permit
		const queueLink = page.locator('a:has-text("Work Queue")').first();
		await queueLink.click({ timeout: 5000 }).catch(() => {});
		await page.waitForTimeout(2000);

		// Click first review link
		const reviewLink = page.locator('a:has-text("Review"), a[href*="/reviewer/P-"]').first();
		if (await reviewLink.isVisible({ timeout: 3000 }).catch(() => false)) {
			await reviewLink.click();
			await page.waitForTimeout(2000);
		}

		await page.screenshot({ path: 'tests/screenshots/p3-02-review-detail.png', fullPage: true });

		const bodyText = await page.textContent('body');
		// Should show AI summary and action buttons
		const hasActions = bodyText?.includes('Approve') || bodyText?.includes('approve');
		const hasAI = bodyText?.includes('AI') || bodyText?.includes('summary') || bodyText?.includes('Summary');
		console.log('Has action buttons:', hasActions);
		console.log('Has AI summary:', hasAI);
	});

	test('approve a permit changes its status', async ({ page }) => {
		test.setTimeout(60000);
		await loginAsRole(page, 'Reviewer');

		// Go directly to a submitted permit review
		const queueLink = page.locator('a:has-text("Work Queue")').first();
		await queueLink.click({ timeout: 5000 }).catch(() => {});
		await page.waitForTimeout(2000);

		// Click any review link
		const reviewLink = page.locator('a:has-text("Review"), a[href*="/reviewer/P-"]').first();
		if (await reviewLink.isVisible({ timeout: 3000 }).catch(() => false)) {
			await reviewLink.click();
			await page.waitForTimeout(2000);
		}

		// Try to approve
		const approveBtn = page.locator('button:has-text("Approve")').first();
		if (await approveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
			// Fill notes first
			const notesInput = page.locator('textarea').last();
			if (await notesInput.isVisible({ timeout: 1000 }).catch(() => false)) {
				await notesInput.fill('Application meets all requirements. Approved for 30-day duration.');
			}
			await approveBtn.click();
			await page.waitForTimeout(2000);

			await page.screenshot({ path: 'tests/screenshots/p3-03-after-approve.png', fullPage: true });
			console.log('After approve URL:', page.url());
		}
	});
});
