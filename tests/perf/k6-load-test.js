import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const chatLatency = new Trend('chat_latency', true);

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 20 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    errors: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8000/api/v1';
const TOKEN = __ENV.TEST_TOKEN || '';

const headers = {
  'Content-Type': 'application/json',
};

if (TOKEN) {
  headers['Authorization'] = `Bearer ${TOKEN}`;
}

export function setup() {
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: 'user77@delta.ai',
    password: 'delta77admin',
  }), { headers });
  check(loginRes, { 'login ok': (r) => r.status === 200 });
  const token = loginRes.json('access_token') || TOKEN;
  return { token };
}

export default function (data) {
  const authHeaders = { ...headers };
  if (data.token) {
    authHeaders['Authorization'] = `Bearer ${data.token}`;
  }

  const chatPayload = JSON.stringify({
    conversation_id: 'perf-test',
    content: '一元二次方程求根公式',
  });

  const chatStart = Date.now();
  const chatRes = http.post(`${BASE_URL}/chat/completions?conversation_id=perf-test&content=${encodeURIComponent('一元二次方程求根公式')}`, '{}', { headers: authHeaders });
  chatLatency.add(Date.now() - chatStart);

  const chatOk = check(chatRes, {
    'chat status 200': (r) => r.status === 200,
    'chat has content': (r) => {
      try { return !!r.json('content'); } catch { return false; }
    },
  });
  errorRate.add(!chatOk);

  sleep(1);

  const examRes = http.post(`${BASE_URL}/exam/generate?subject=math&chapter=equations&difficulty=medium&count=5`, '{}', { headers: authHeaders });
  const examOk = check(examRes, {
    'exam status 200': (r) => r.status === 200,
  });
  errorRate.add(!examOk);

  sleep(1);

  const reportRes = http.get(`${BASE_URL}/reports/study?period=week`, { headers: authHeaders });
  check(reportRes, { 'report status 200': (r) => r.status === 200 || r.status === 404 });

  sleep(2);
}
