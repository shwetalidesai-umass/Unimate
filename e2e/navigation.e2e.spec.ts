import { test, expect } from '@playwright/test';
import { setAuthToken, testLoginViaApi } from './_helpers';

test('sidebar navigation works across main pages', async ({ page }) => {
  const { accessToken } = await testLoginViaApi(page.request, { onboarding_done: true });
  await setAuthToken(page, accessToken);

  await page.goto('/dashboard');
  await expect(page.getByText('Live Activity')).toBeVisible();

  await page.getByRole('button', { name: 'Collaborate' }).click();
  await expect(page).toHaveURL(/\/collaborate$/);
  await expect(page.getByText('Collaboration Posts')).toBeVisible();

  await page.getByRole('button', { name: 'Discussions' }).click();
  await expect(page).toHaveURL(/\/discussions$/);
  await expect(page.getByRole('heading', { name: 'Discussions' })).toBeVisible();

  await page.getByRole('button', { name: 'Reviews' }).click();
  await expect(page).toHaveURL(/\/reviews$/);
  await expect(page.getByText('Write a Review')).toBeVisible();

  // Profile is reached from avatar click on dashboard.
  await page.getByRole('button', { name: 'Dashboard' }).click();
  await page.locator('.dash-avatar').first().click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByText('PERSONAL INFO')).toBeVisible();
});

