/**
 * Unimate Load Test — k6
 *
 * Ramps up to 20 virtual users, holds for 1 minute, ramps down.
 *
 * HOW TO RUN:
 *   k6 run server/load_tests/load_test.js
 *
 * WITH AUTH TOKEN:
 *   JWT_TOKEN="your_token_here" k6 run server/load_tests/load_test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ── Custom Metrics ────────────────────────────────────────────
const errorRate      = new Rate('error_rate');
const healthDuration = new Trend('health_duration');
const reviewDuration = new Trend('review_duration');
const searchDuration = new Trend('search_duration');

// ── Config ────────────────────────────────────────────────────
const BASE_URL  = __ENV.BASE_URL  || 'http://localhost:4000';
const JWT_TOKEN = __ENV.JWT_TOKEN || '';

// ── Load Stages ───────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // ramp up:   0 → 10 users
    { duration: '1m',  target: 20 },  // sustained: hold 20 users
    { duration: '30s', target: 0  },  // ramp down: 20 → 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% under 2 seconds
    http_req_failed:   ['rate<0.05'],   // less than 5% errors
    error_rate:        ['rate<0.05'],
  },
};

// ── Helpers ───────────────────────────────────────────────────
function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (JWT_TOKEN) headers['Authorization'] = `Bearer ${JWT_TOKEN}`;
  return headers;
}

const statusOk = (r) => r.status === 200 || r.status === 401;

// ── Scenarios ─────────────────────────────────────────────────
function testHealthEndpoint() {
  const res = http.get(`${BASE_URL}/api/health`);
  const ok = check(res, {
    'health: status is 200':       (r) => r.status === 200,
    'health: status field is ok':  (r) => r.json('status') === 'ok',
    'health: responds in < 500ms': (r) => r.timings.duration < 500,
  });
  errorRate.add(!ok);
  healthDuration.add(res.timings.duration);
}

function testReviewsEndpoints() {
  const coursesRes = http.get(
    `${BASE_URL}/api/reviews/courses`,
    { headers: getHeaders(), responseCallback: http.expectedStatuses(200, 401) }
  );
  const coursesOk = check(coursesRes, {
    'reviews/courses: reachable':        statusOk,
    'reviews/courses: responds in < 1s': (r) => r.timings.duration < 1000,
  });
  errorRate.add(!coursesOk);
  reviewDuration.add(coursesRes.timings.duration);

  const profsRes = http.get(
    `${BASE_URL}/api/reviews/professors`,
    { headers: getHeaders(), responseCallback: http.expectedStatuses(200, 401) }
  );
  const profsOk = check(profsRes, {
    'reviews/professors: reachable':        statusOk,
    'reviews/professors: responds in < 1s': (r) => r.timings.duration < 1000,
  });
  errorRate.add(!profsOk);
  reviewDuration.add(profsRes.timings.duration);
}

function testDashboardEndpoints() {
  const res = http.get(
    `${BASE_URL}/api/dashboard/stats`,
    { headers: getHeaders(), responseCallback: http.expectedStatuses(200, 401) }
  );
  check(res, {
    'dashboard/stats: reachable':        statusOk,
    'dashboard/stats: responds in < 1s': (r) => r.timings.duration < 1000,
  });
}

function testSearchEndpoint() {
  const queries = ['math', 'cs', 'biology', 'english', 'physics'];
  const q = queries[Math.floor(Math.random() * queries.length)];

  const res = http.get(
    `${BASE_URL}/api/search?q=${q}`,
    { headers: getHeaders(), responseCallback: http.expectedStatuses(200, 401) }
  );
  const ok = check(res, {
    'search: reachable':           statusOk,
    'search: responds in < 1.5s':  (r) => r.timings.duration < 1500,
  });
  errorRate.add(!ok);
  searchDuration.add(res.timings.duration);
}

// ── Main Loop ─────────────────────────────────────────────────
export default function () {
  testHealthEndpoint();
  sleep(0.5);

  testReviewsEndpoints();
  sleep(0.5);

  testDashboardEndpoints();
  sleep(0.5);

  testSearchEndpoint();

  sleep(Math.random() * 2 + 1);  // 1–3s think time between iterations
}