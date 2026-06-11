import { test, expect } from '@playwright/test';
import { setAuthToken, testLoginViaApi } from './_helpers';

test('unauthenticated user is redirected to /login', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('UniMate')).toBeVisible();
});

test('authenticated user can load dashboard', async ({ page }) => {
  const { accessToken } = await testLoginViaApi(page.request, { onboarding_done: true });
  await setAuthToken(page, accessToken);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Live Activity')).toBeVisible();
});

test('authenticated but not onboarded is redirected to /onboarding', async ({ page }) => {
  const { accessToken } = await testLoginViaApi(page.request, { onboarding_done: false });
  await setAuthToken(page, accessToken);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByText('STEP 1 OF 2')).toBeVisible();
});

