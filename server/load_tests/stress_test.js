/**
 * Unimate Stress Test — k6
 *
 * Pushes the server beyond normal load to find its breaking point.
 * Ramps up to 100 virtual users over 5 minutes.
 *
 * ⚠️  Only run after smoke_test and load_test both pass.
 * ⚠️  Don't run against production without explicit permission.
 *
 * HOW TO RUN:
 *   k6 run server/load_tests/stress_test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL  = __ENV.BASE_URL  || 'http://localhost:4000';
const JWT_TOKEN = __ENV.JWT_TOKEN || '';

const errorRate = new Rate('error_rate');

export const options = {
  stages: [
    { duration: '1m',  target: 20  },  // normal load
    { duration: '2m',  target: 50  },  // heavy load
    { duration: '2m',  target: 100 },  // stress — find the ceiling
    { duration: '1m',  target: 50  },  // scale back
    { duration: '1m',  target: 0   },  // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],  // allow up to 5s under stress
    http_req_failed:   ['rate<0.10'],   // allow up to 10% errors under stress
    error_rate:        ['rate<0.10'],
  },
};

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (JWT_TOKEN) headers['Authorization'] = `Bearer ${JWT_TOKEN}`;
  return headers;
}

const statusOk = (r) => r.status === 200 || r.status === 401;

export default function () {
  // Health — no auth needed
  const health = http.get(`${BASE_URL}/api/health`);
  const ok = check(health, {
    'health: still responding':    (r) => r.status === 200,
    'health: responds in < 500ms': (r) => r.timings.duration < 500,
  });
  errorRate.add(!ok);

  // Protected routes
  http.get(
    `${BASE_URL}/api/reviews/courses`,
    { headers: getHeaders(), responseCallback: http.expectedStatuses(200, 401) }
  );

  http.get(
    `${BASE_URL}/api/reviews/professors`,
    { headers: getHeaders(), responseCallback: http.expectedStatuses(200, 401) }
  );

  http.get(
    `${BASE_URL}/api/search?q=cs`,
    { headers: getHeaders(), responseCallback: http.expectedStatuses(200, 401) }
  );

  http.get(
    `${BASE_URL}/api/dashboard/stats`,
    { headers: getHeaders(), responseCallback: http.expectedStatuses(200, 401) }
  );

  sleep(1);
}