import type { HttpEvent } from './sli.ts'
import type { Operation } from './cohorts.ts'
const base: HttpEvent = { id: 'http-01', route: 'GET /reports/{id}', traffic: 'user', requestValid: true,
  status: 200, bodyValid: true, expectedNotFound: false, durationMs: 100 }
export const httpEvents: HttpEvent[] = [base,
  { ...base, id: 'http-02', durationMs: 900 },
  { ...base, id: 'http-03', status: 503, durationMs: 10 },
  { ...base, id: 'http-04', status: null, durationMs: null },
  { ...base, id: 'http-05', status: 404, expectedNotFound: true, durationMs: 80 },
  { ...base, id: 'http-06', bodyValid: false },
  { ...base, id: 'http-07', status: 400, requestValid: false },
  { ...base, id: 'http-08', traffic: 'synthetic' },
  { ...base, id: 'http-09', route: 'GET /health' },
]
export const operations: Operation[] = [
  { id: 'op-01', createdAt: 0, finishedAt: 3, outcome: 'completed' },
  { id: 'op-02', createdAt: 1, finishedAt: 8, outcome: 'completed' },
  { id: 'op-03', createdAt: 2, finishedAt: 3, outcome: 'failed' },
  { id: 'op-04', createdAt: 3, finishedAt: null, outcome: null },
  { id: 'op-05', createdAt: 9, finishedAt: 9, outcome: 'completed' },
  { id: 'op-06', createdAt: 9, finishedAt: null, outcome: null },
  { id: 'op-07', createdAt: 12, finishedAt: null, outcome: null },
]
