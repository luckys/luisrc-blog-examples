import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ROOT_CONTEXT, trace, SpanKind } from '@opentelemetry/api'
import { createTracing, within, inject } from '../src/tracing.ts'

function App() {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('Sin operaciones')
  async function submit(scenario: string) {
    setBusy(true)
    const runtime = createTracing('jobs-web', scenario !== 'unsampled')
    try {
      const job = await within(runtime.tracer, 'ui.submit', ROOT_CONTEXT, async (uiSpan) => {
        const uiCtx = trace.setSpan(ROOT_CONTEXT, uiSpan)
        return within(runtime.tracer, 'POST /jobs client', uiCtx, async (httpSpan) => {
          const headers = { 'content-type': 'application/json', ...inject(trace.setSpan(uiCtx, httpSpan)) }
          const response = await fetch('/jobs', { method: 'POST', headers, body: JSON.stringify({ scenario }) })
          if (response.status !== 202) throw new Error('fixture rejected request')
          const accepted = await response.json()
          uiSpan.setAttribute('lab.operation_id', accepted.operationId)
          httpSpan.setAttribute('lab.operation_id', accepted.operationId)
          return accepted
        }, { kind: SpanKind.CLIENT })
      })
      await runtime.provider.forceFlush()
      const exported = await fetch('/telemetry/browser', { method: 'POST', body: JSON.stringify(runtime.spans) })
      if (!exported.ok) throw new Error('fixture exporter failed')
      setResult(`${job.operationId}: ${job.status} (${scenario})`)
    } catch (error) {
      setResult(String(error))
    } finally {
      await runtime.provider.shutdown()
      setBusy(false)
    }
  }
  return <main>
    <h1>Seguir una operación desde React hasta el worker</h1>
    <p>Fixture local: 202 significa aceptado, no terminado. El worker espera 20 ms y corre en otro proceso. Sin broker durable.</p>
    {(['ok', 'fail', 'broken', 'link', 'unsampled'] as const).map((scenario) =>
      <button key={scenario} disabled={busy} onClick={() => void submit(scenario)}>{scenario}</button>)}
    <p role="status" aria-live="polite">{result}</p>
    <p>Los spans se envían a un receptor JSON del fixture. No es un exporter OTLP.</p>
  </main>
}
createRoot(document.getElementById('root')!).render(<App />)
