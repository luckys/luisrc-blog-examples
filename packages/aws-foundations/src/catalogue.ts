export type CatalogueItem = { id: string; name: string; priceCents: number }
export type Reader = (id: string) => Promise<CatalogueItem | null>
export async function catalogueRequest(method: string, path: string, read: Reader) {
  const match = /^\/catalogue\/([a-z0-9-]{1,40})$/.exec(path)
  if (method !== 'GET') return { statusCode: 405, body: { error: 'method_not_allowed' } }
  if (!match) return { statusCode: 404, body: { error: 'not_found' } }
  try {
    const item = await read(match[1]!)
    return item ? { statusCode: 200, body: item } : { statusCode: 404, body: { error: 'not_found' } }
  } catch { return { statusCode: 503, body: { error: 'dependency_unavailable' } } }
}

export function lambdaAdapter(read: Reader) {
  return async (event: { rawPath: string; requestContext: { http: { method: string } } }) => {
    const result = await catalogueRequest(event.requestContext.http.method, event.rawPath, read)
    return { statusCode: result.statusCode, headers: { 'content-type': 'application/json' }, body: JSON.stringify(result.body), isBase64Encoded: false }
  }
}
