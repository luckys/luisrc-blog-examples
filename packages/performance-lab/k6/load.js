import http from 'k6/http'
import { check } from 'k6'

const base = __ENV.BASE_URL
if (!/^http:\/\/127\.0\.0\.1:[0-9]+$/.test(base)) throw new Error('only owned loopback fixture')
const mode = __ENV.MODE
if (!['open', 'closed'].includes(mode)) throw new Error('mode')
const rate = Number(__ENV.RATE)
const seconds = Number(__ENV.SECONDS)
const vus = Number(__ENV.VUS)
if (!Number.isInteger(rate) || rate < 1 || rate > 400 || !Number.isInteger(seconds) || seconds < 3 || seconds > 60 || !Number.isInteger(vus) || vus < 1 || vus > 100)
  throw new Error('bounded local experiment only')

export const options = {
  scenarios: { measured: mode === 'open' ? {
    executor: 'constant-arrival-rate', rate, timeUnit: '1s', duration: `${seconds}s`,
    preAllocatedVUs: vus, maxVUs: vus, gracefulStop: '3s',
  } : { executor: 'constant-vus', vus, duration: `${seconds}s`, gracefulStop: '3s' } },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
    dropped_iterations: ['count==0'],
    'http_req_duration{expected_response:true}': ['p(95)<200'],
  },
  maxRedirects: 0,
}

export default function () {
  const response = http.get(`${base}/work`, { timeout: '2s', tags: { name: '/work' } })
  check(response, { 'successful work': (r) => r.status === 200 && r.body === 'ok' })
}

export function handleSummary(data) {
  return { [__ENV.SUMMARY_FILE]: JSON.stringify(data) }
}
