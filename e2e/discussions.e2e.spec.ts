import { test, expect } from '@playwright/test';
import { setAuthToken, testLoginViaApi } from './_helpers';

test('can create a question, vote, and answer it', async ({ page }) => {
  const nonce = Date.now();
  const { accessToken } = await testLoginViaApi(page.request, { email: `discuss-${nonce}@umass.edu`, full_name: 'Discuss User', onboarding_done: true });
  await setAuthToken(page, accessToken);

  await page.goto('/discussions');
  await expect(page.getByText('Start a New Question')).toBeVisible();

  await page.getByPlaceholder('Course code (CS520)').fill('COMPSCI 520');
  const qText = `How do I run integration tests? (E2E ${nonce})`;
  await page.getByPlaceholder('Your question').fill(qText);
  await page.getByRole('button', { name: 'Post Question' }).click();

  const questionRow = page.locator('.dash-discuss-item', { hasText: qText }).first();
  await expect(questionRow).toBeVisible();

  // Vote up once; votes should increment from 0 to 1 eventually.
  await questionRow.getByRole('button', { name: 'Upvote' }).click();
  await expect(questionRow.locator('.dash-vote-num')).not.toHaveText('0');

  // View answers and post one.
  await questionRow.getByRole('button', { name: 'View Answers' }).click();
  await expect(page.getByText('No answers yet.')).toBeVisible();
  await page.getByPlaceholder('Write an answer').fill('Run `npm run test:e2e` from the repo root.');
  await page.getByRole('button', { name: 'Post Answer' }).click();
  await expect(page.getByText('Run `npm run test:e2e` from the repo root.')).toBeVisible();
});

