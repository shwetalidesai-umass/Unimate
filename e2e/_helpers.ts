import { expect, type Page, type APIRequestContext } from '@playwright/test';

export async function testLoginViaApi(
  request: APIRequestContext,
  opts?: { email?: string; full_name?: string; onboarding_done?: boolean; school?: string },
) {
  const res = await request.post('http://localhost:4000/api/auth/test/login', {
    data: {
      email: opts?.email ?? 'student@umass.edu',
      full_name: opts?.full_name ?? 'E2E Student',
      onboarding_done: opts?.onboarding_done ?? true,
      school: opts?.school ?? 'umass',
    },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(typeof body.accessToken).toBe('string');
  return {
    ...(body as {
      accessToken: string;
      refreshToken: string;
      user: { id: string; email: string; full_name: string; onboarding_done: boolean };
    }),
  };
}

export async function setAuthToken(page: Page, token: string) {
  await page.addInitScript((t) => {
    window.localStorage.setItem('unimate_token', t);
  }, token);
}

export async function setRefreshTokenCookie(page: Page, refreshToken: string) {
  if (!refreshToken) return;
  await page.context().addCookies([{
    name: 'unimate_rt',
    value: refreshToken,
    url: 'http://localhost:3000',
    httpOnly: true,
    sameSite: 'Strict',
  }]);
}

