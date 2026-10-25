import { request } from 'node:http'
export async function requestCatalogue(origin) {
  const url = new URL('/catalogue', origin)
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1') throw Error('loopback_origin_required')
  return new Promise((resolve, reject) => {
    const req = request(url, { headers: { host: 'catalogue.lab.test' } }, (res) => {
      let text = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => { text += chunk; if (text.length > 65536) req.destroy(Error('response_too_large')) })
      res.on('error', reject)
      res.on('end', () => {
        let body
        try { body = JSON.parse(text) } catch { body = { error: 'non_json_response' } }
        resolve({ status: res.statusCode, body })
      })
    })
    req.on('error', reject); req.setTimeout(3000, () => req.destroy(Error('request_timeout'))); req.end()
  })
}
