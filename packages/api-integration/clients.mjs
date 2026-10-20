function endpoint(origin, path) {
  const url = new URL(origin)
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.pathname !== '/')
    throw new Error('loopback_fixture_only')
  return new URL(path, url)
}
const headers = { authorization: 'Bearer fixture-north' }

export async function readOrder(origin, etag) {
  const res = await fetch(endpoint(origin, '/orders/o1'), {
    headers: { ...headers, ...(etag ? { 'if-none-match': etag } : {}) },
    signal: AbortSignal.timeout(3000),
    redirect: 'error',
  })
  if (![200, 304].includes(res.status)) throw new Error(`snapshot_${res.status}`)
  return {
    status: res.status,
    etag: res.headers.get('etag'),
    order: res.status === 200 ? await res.json() : null,
  }
}

export async function openEvents(origin, after) {
  const controller = new AbortController()
  const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(5000)])
  const res = await fetch(endpoint(origin, `/orders/o1/events?after=${after}`), {
    headers,
    signal,
    redirect: 'error',
  })
  if (res.status !== 200) {
    await res.body.cancel()
    throw new Error(`stream_${res.status}`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  return {
    async next() {
      while (true) {
        const boundary = buffer.indexOf('\n\n')
        if (boundary !== -1) {
          const frame = buffer.slice(0, boundary)
          buffer = buffer.slice(boundary + 2)
          if (!frame.includes('event: order\n')) continue
          return JSON.parse(
            frame
              .split('\n')
              .find((line) => line.startsWith('data: '))
              .slice(6),
          )
        }
        const { value, done } = await reader.read()
        if (done) throw new Error('stream_ended_reconnect_and_reconcile')
        buffer += decoder.decode(value, { stream: true })
        if (buffer.length > 16384) throw new Error('frame_too_large')
      }
    },
    async close() {
      controller.abort()
      await reader.cancel().catch(() => {})
    },
  }
}
