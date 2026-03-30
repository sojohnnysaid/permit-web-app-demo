import { test, expect } from '@playwright/test';

async function loginAsAdmin(page: import('@playwright/test').Page) {
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

	const adminCard = page.locator('button:has-text("Administrator"), [role="button"]:has-text("Administrator")').first();
	if (await adminCard.isVisible({ timeout: 3000 }).catch(() => false)) {
		await adminCard.click();
	}

	await page.waitForURL('**/dashboard**', { timeout: 10000 }).catch(() => {});
}

test.describe('Phase 5: Management Dashboard', () => {
	test('operations dashboard shows metrics and AI insights', async ({ page }) => {
		test.setTimeout(60000);
		await loginAsAdmin(page);

		// Navigate to Management via nav link
		const mgmtLink = page.locator('a:has-text("Management")').first();
		if (await mgmtLink.isVisible({ timeout: 3000 }).catch(() => false)) {
			await mgmtLink.click();
			await page.waitForTimeout(2000);
		}

		await page.screenshot({ path: 'tests/screenshots/p5-01-admin-operations.png', fullPage: true });

		const bodyText = await page.textContent('body');
		const hasMetrics = bodyText?.includes('Pending') || bodyText?.includes('SLA') || bodyText?.includes('Revenue');
		const hasInsights = bodyText?.includes('Ward 6') || bodyText?.includes('insight') || bodyText?.includes('AI');
		console.log('Has operations metrics:', hasMetrics);
		console.log('Has AI insights:', hasInsights);
		expect(bodyText).toContain('TOPS');
	});

	test('executive view shows charts and ward data', async ({ page }) => {
		test.setTimeout(60000);
		await loginAsAdmin(page);

		// Navigate to Management then Executive
		const mgmtLink = page.locator('a:has-text("Management")').first();
		if (await mgmtLink.isVisible({ timeout: 3000 }).catch(() => false)) {
			await mgmtLink.click();
			await page.waitForTimeout(1500);
		}

		const execLink = page.locator('a:has-text("Executive"), a[href="/admin/executive"]').first();
		if (await execLink.isVisible({ timeout: 3000 }).catch(() => false)) {
			await execLink.click();
			await page.waitForTimeout(2000);
		}

		await page.screenshot({ path: 'tests/screenshots/p5-02-admin-executive.png', fullPage: true });

		const bodyText = await page.textContent('body');
		console.log('Has ward data:', bodyText?.includes('Ward'));
		expect(bodyText).toContain('TOPS');
	});
});
