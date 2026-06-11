import { test, expect } from '@playwright/test';

test('backend health endpoint is reachable', async ({ request }) => {
  const res = await request.get('http://localhost:4000/api/health');
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body).toEqual({ status: 'ok' });
});

