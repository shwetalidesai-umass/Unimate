/**
 * Unimate Smoke Test — k6
 *
 * A lightweight sanity check: 1 virtual user, 30 seconds.
 * Run this FIRST before the full load test to make sure the
 * server is up and all endpoints respond correctly.
 *
 * HOW TO RUN:
 *   k6 run server/load_tests/smoke_test.js
 *
 * WITH AUTH TOKEN:
 *   JWT_TOKEN="your_token_here" k6 run server/load_tests/smoke_test.js
 *
 * AGAINST DEPLOYED SERVER:
 *   BASE_URL="https://your-api.com" k6 run server/load_tests/smoke_test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL  = __ENV.BASE_URL  || 'http://localhost:4000';
const JWT_TOKEN = __ENV.JWT_TOKEN || '';

export const options = {
  vus:      1,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(99)<3000'],  // 99% of requests under 3 seconds
    http_req_failed:   ['rate<0.01'],   // less than 1% failures
  },
};

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (JWT_TOKEN) headers['Authorization'] = `Bearer ${JWT_TOKEN}`;
  return headers;
}

// Shorthand: accepts both 200 (authed) and 401 (no token) as valid
const statusOk = (r) => r.status === 200 || r.status === 401;

export default function () {

  // ── 1. Health check ──────────────────────────────────────────
  const health = http.get(`${BASE_URL}/api/health`);
  check(health, {
    '✅ health endpoint is up':  (r) => r.status === 200,
    '✅ health returns JSON':    (r) => r.headers['Content-Type'] != null &&
                                       r.headers['Content-Type'].includes('application/json'),
    '✅ status field is ok':     (r) => r.json('status') === 'ok',
  });
  sleep(1);

  // ── 2. Reviews — courses list ─────────────────────────────────
  const courses = http.get(
    `${BASE_URL}/api/reviews/courses`,
    {
      headers:          getHeaders(),
      responseCallback: http.expectedStatuses(200, 401),
    }
  );
  check(courses, {
    '✅ courses list reachable': statusOk,
  });
  sleep(1);

  // ── 3. Reviews — professors list ──────────────────────────────
  const profs = http.get(
    `${BASE_URL}/api/reviews/professors`,
    {
      headers:          getHeaders(),
      responseCallback: http.expectedStatuses(200, 401),
    }
  );
  check(profs, {
    '✅ professors list reachable': statusOk,
  });
  sleep(1);

  // ── 4. Search ─────────────────────────────────────────────────
  const search = http.get(
    `${BASE_URL}/api/search?q=math`,
    {
      headers:          getHeaders(),
      responseCallback: http.expectedStatuses(200, 401),
    }
  );
  check(search, {
    '✅ search endpoint reachable': statusOk,
  });
  sleep(1);
}