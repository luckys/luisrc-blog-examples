import test from 'node:test'
import assert from 'node:assert/strict'
import { estimate, validateInputs } from '../src/costs.ts'
const rates = { lambdaRequest: 0.0000002, lambdaGbSecond: 0.0000166667, httpApiRequest: 0.000001,
  fargateVcpuHour: 0.04048, fargateGbHour: 0.004445, albHour: 0.0225, albLcuHour: 0.008,
  endpointAzHour: 0.01, endpointGb: 0.01, publicIpv4Hour: 0.005 }
const inputs = { requests: 1000000, hours: 730, memoryMb: 512, billedMs: 100,
  payloadBytes: 1024,
  tasks: 2, taskVcpu: 0.25, taskMemoryGb: 0.5, interfaceServices: 3, zones: 2,
  interfaceGb: 20, publicIpv4: 2, assumedLcu: 0.1 }

test('Lambda: unidades GB-s y requests; sin tier gratis o descuentos implícitos', () => {
  const result = estimate(inputs, rates)
  assert.equal(result.lambda.units.gbSeconds, 50000)
  assert.equal(result.lambda.lines.requests, 0.2)
  assert.equal(result.lambda.lines.httpApi, 1)
  assert.ok(Math.abs(result.lambda.subtotal - 2.033335) < 1e-10)
})

test('ECS: no esconde ALB, endpoints por AZ o IPv4 detrás del precio de la task', () => {
  const result = estimate(inputs, rates)
  assert.equal(result.ecs.lines.endpointHours, 43.8)
  assert.equal(result.ecs.lines.endpointData, 0.2)
  assert.equal(result.ecs.lines.publicIpv4, 7.3)
  assert.ok(result.ecs.subtotal > result.ecs.lines.compute)
  assert.ok(Math.abs(result.ecs.subtotal - Object.values(result.ecs.lines).reduce((a, b) => a + b, 0)) < 1e-10)
})

test('sin tráfico: Lambda variable cero, infraestructura ECS sigue provisionada', () => {
  const result = estimate({ ...inputs, requests: 0 }, rates)
  assert.equal(result.lambda.subtotal, 0); assert.ok(result.ecs.subtotal > 0)
  assert.equal(result.capacityValidated, false)
})

test('rechaza unidades, shapes y tramos fuera del modelo en vez de inventar un coste', () => {
  for (const value of [{ ...inputs, requests: -1 }, { ...inputs, requests: 1.1 }, { ...inputs, requests: 300000001 },
    { ...inputs, memoryMb: 0 }, { ...inputs, billedMs: Infinity }, { ...inputs, tasks: 0 },
    { ...inputs, taskVcpu: 0.25, taskMemoryGb: 4 }, { ...inputs, zones: 1 },
    { ...inputs, interfaceServices: 0 }, { ...inputs, payloadBytes: 524289 }]) assert.throws(() => validateInputs(value))
  assert.throws(() => estimate(inputs, { ...rates, lambdaGbSecond: NaN }))
  const missing = { ...inputs }; delete missing.hours
  assert.throws(() => validateInputs(missing))
})

test('sensibilidad: peticiones y duración afectan Lambda; más tasks afectan ECS', () => {
  const baseline = estimate(inputs, rates)
  assert.equal(estimate({ ...inputs, requests: 2000000 }, rates).lambda.subtotal, 2 * baseline.lambda.subtotal)
  assert.ok(estimate({ ...inputs, billedMs: 200 }, rates).lambda.subtotal > baseline.lambda.subtotal)
  assert.equal(estimate({ ...inputs, tasks: 4 }, rates).ecs.lines.compute, 2 * baseline.ecs.lines.compute)
  assert.equal(estimate({ ...inputs, tasks: 4 }, rates).ecs.lines.endpointHours, baseline.ecs.lines.endpointHours)
})
