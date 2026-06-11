import { test, expect } from '@playwright/test';
import { setAuthToken, testLoginViaApi } from './_helpers';

test('can create a collaboration post and open its group chat page', async ({ page }) => {
  const nonce = Date.now();
  const { accessToken } = await testLoginViaApi(page.request, { email: `author-${nonce}@umass.edu`, full_name: 'Author', onboarding_done: true });
  await setAuthToken(page, accessToken);

  await page.goto('/collaborate');
  await expect(page.getByText('Create New Post')).toBeVisible();

  const title = `Need project partner (E2E ${nonce})`;
  await page.getByPlaceholder('Course code (CS520)').fill('COMPSCI 520');
  await page.getByPlaceholder('Post title').fill(title);
  await page.getByRole('combobox').selectOption({ label: 'Project' });
  await page.getByPlaceholder('Max members (1–20)').fill('2');
  await page.getByRole('button', { name: 'Create Post' }).click();

  const cardTitle = page.getByRole('heading', { name: title }).first();
  await expect(cardTitle).toBeVisible();

  // As author, click card to open group chat details page (should not redirect externally).
  await cardTitle.click();
  await expect(page).toHaveURL(/\/collaborate\/.+\/chat$/);
  await expect(page.getByText('Members')).toBeVisible();
});

test('second user can join a collaboration post', async ({ browser }) => {
  const nonce = Date.now();
  const title = `Study group (E2E ${nonce})`;

  // Author context creates a post.
  const author = await browser.newContext();
  const authorPage = await author.newPage();
  const { accessToken: authorToken } = await testLoginViaApi(authorPage.request, {
    email: `author2-${nonce}@umass.edu`,
    full_name: 'Author Two',
    onboarding_done: true,
  });
  await setAuthToken(authorPage, authorToken);

  await authorPage.goto('/collaborate');
  await authorPage.getByPlaceholder('Course code (CS520)').fill('COMPSCI 326');
  await authorPage.getByPlaceholder('Post title').fill(title);
  await authorPage.getByRole('combobox').selectOption({ label: 'Study' });
  await authorPage.getByPlaceholder('Max members (1–20)').fill('2');
  await authorPage.getByRole('button', { name: 'Create Post' }).click();
  await expect(authorPage.getByRole('heading', { name: title }).first()).toBeVisible();

  // Joiner context joins it.
  const joiner = await browser.newContext();
  const joinerPage = await joiner.newPage();
  const { accessToken: joinerToken } = await testLoginViaApi(joinerPage.request, {
    email: `joiner-${nonce}@umass.edu`,
    full_name: 'Joiner',
    onboarding_done: true,
  });
  await setAuthToken(joinerPage, joinerToken);

  await joinerPage.goto('/collaborate');
  const joinCardHeading = joinerPage.getByRole('heading', { name: title }).first();
  await expect(joinCardHeading).toBeVisible();

  const joinCard = joinCardHeading.locator('xpath=ancestor::*[contains(@class,"dash-card")][1]');
  await joinCard.getByRole('button', { name: 'Join →' }).click();

  // After join, the card should show "Leave".
  await expect(joinCard.getByRole('button', { name: 'Leave' })).toBeVisible();

  await author.close();
  await joiner.close();
});

