import { test, expect } from '@playwright/test';
import { setAuthToken, testLoginViaApi } from './_helpers';

test('can complete onboarding flow (step 1 → step 2 → finish)', async ({ page }) => {
  const login = await testLoginViaApi(page.request, {
    email: 'new@umass.edu',
    full_name: 'New User',
    // Keep token onboarded so even if refresh fails, redirect sticks.
    onboarding_done: true,
  });
  await setAuthToken(page, login.accessToken);

  await page.goto('/onboarding');
  await expect(page.getByText('STEP 1 OF 2')).toBeVisible();

  // The <label> isn't associated via htmlFor, so select by role.
  await page.getByRole('combobox').first().selectOption({ value: 'umass' });
  await page.getByPlaceholder('e.g. 2027').fill('2027');
  await page.getByPlaceholder('e.g. Computer Science, Biology').fill('Computer Science');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText('STEP 2 OF 2')).toBeVisible();

  // Wait for courses to load and select the first checkbox.
  const firstCheckbox = page.locator('input[type="checkbox"]').first();
  await expect(firstCheckbox).toBeVisible();
  await firstCheckbox.check();

  await page.getByPlaceholder('e.g. Weekdays, Evenings, Anytime').fill('Evenings');
  await page.getByRole('button', { name: 'Finish' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Live Activity')).toBeVisible();
});

