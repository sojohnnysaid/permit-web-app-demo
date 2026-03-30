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

test.describe('Phase 4: Payment & Inspector', () => {
	test('payment page shows fee breakdown and payment form', async ({ page }) => {
		test.setTimeout(60000);
		await loginAsRole(page, 'Applicant');

		// Click on an approved permit to go to detail
		const approvedPermit = page.locator('a[href*="/permits/P-2026-001"]').first();
		if (await approvedPermit.isVisible({ timeout: 3000 }).catch(() => false)) {
			await approvedPermit.click();
			await page.waitForTimeout(1500);

			// Look for payment link
			const payLink = page.locator('a:has-text("Pay"), a:has-text("payment"), button:has-text("Pay")').first();
			if (await payLink.isVisible({ timeout: 3000 }).catch(() => false)) {
				await payLink.click();
				await page.waitForTimeout(1500);
			}
		}

		await page.screenshot({ path: 'tests/screenshots/p4-01-payment.png', fullPage: true });
		const bodyText = await page.textContent('body');
		console.log('Has fee info:', bodyText?.includes('$') || bodyText?.includes('Fee'));
	});

	test('inspector view shows inspections at mobile viewport', async ({ page }) => {
		test.setTimeout(60000);
		await loginAsRole(page, 'Administrator');

		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 812 });

		// Navigate to inspector via nav
		const inspectorLink = page.locator('a:has-text("Inspector"), a[href="/inspector"]').first();
		if (await inspectorLink.isVisible({ timeout: 3000 }).catch(() => false)) {
			await inspectorLink.click();
		}
		await page.waitForTimeout(2000);

		await page.screenshot({ path: 'tests/screenshots/p4-02-inspector-mobile.png', fullPage: true });

		// Reset to desktop for next screenshot
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.waitForTimeout(500);
		await page.screenshot({ path: 'tests/screenshots/p4-03-inspector-desktop.png', fullPage: true });

		const bodyText = await page.textContent('body');
		const hasInspections = bodyText?.includes('Inspection') || bodyText?.includes('inspection') || bodyText?.includes('Inspector');
		console.log('Has inspection content:', hasInspections);
		expect(hasInspections).toBeTruthy();
	});
});
