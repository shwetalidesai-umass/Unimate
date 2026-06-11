import { test, expect } from '@playwright/test';
import { setAuthToken, testLoginViaApi } from './_helpers';

test('can submit a course review from the Reviews page', async ({ page }) => {
  const nonce = Date.now();
  const { accessToken } = await testLoginViaApi(page.request, { email: `reviewer-${nonce}@umass.edu`, full_name: 'Reviewer', onboarding_done: true });
  await setAuthToken(page, accessToken);

  await page.goto('/reviews');
  await expect(page.getByText('Write a Review')).toBeVisible();

  // Select first course option (after the placeholder).
  const form = page.locator('.rev-form-card');
  const select = form.locator('select.rev-input');
  await expect(select).toBeVisible();
  await page.waitForFunction(() => {
    const el = document.querySelector('select.rev-input');
    return !!el && el.querySelectorAll('option').length > 1;
  });
  await select.selectOption({ index: 1 });

  // Click 5th star (rating 5).
  await form.locator('.stars button').nth(4).click();
  const bodyText = `Great course (E2E ${nonce}).`;
  await form.getByPlaceholder('What should other students know? Be honest and specific.').fill(bodyText);

  await form.getByRole('button', { name: 'Submit Review' }).click();
  await expect(page.getByText(/Review submitted successfully!|already reviewed/i)).toBeVisible();

  // The new review should appear in the feed.
  await expect(page.getByText(bodyText)).toBeVisible();
});

test('can submit a professor review from the Reviews page', async ({ page }) => {
  const nonce = Date.now();
  const { accessToken } = await testLoginViaApi(page.request, { email: `prof-reviewer-${nonce}@umass.edu`, full_name: 'Prof Reviewer', onboarding_done: true });
  await setAuthToken(page, accessToken);

  await page.goto('/reviews');
  await page.getByRole('button', { name: 'Professors' }).click();

  const form = page.locator('.rev-form-card');
  const select = form.locator('select.rev-input');
  await expect(select).toBeVisible();
  await page.waitForFunction(() => {
    const el = document.querySelector('select.rev-input');
    return !!el && el.querySelectorAll('option').length > 1;
  });
  await select.selectOption({ index: 1 });

  await form.locator('.stars button').nth(3).click(); // 4 stars
  const bodyText = `Helpful professor (E2E ${nonce}).`;
  await form.getByPlaceholder('What should other students know? Be honest and specific.').fill(bodyText);

  await form.getByRole('button', { name: 'Submit Review' }).click();
  await expect(page.getByText(/Review submitted successfully!|already reviewed/i)).toBeVisible();
  await expect(page.getByText(bodyText)).toBeVisible();
});

