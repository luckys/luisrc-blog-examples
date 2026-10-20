const statuses = new Set(['pending', 'paid', 'shipped', 'cancelled'])
export const fault = (status, message) => Object.assign(new Error(message), { status })

export function principal(authorization) {
  // Public fixture identities, deliberately NOT a production authenticator.
  if (authorization === 'Bearer fixture-north') return 'north'
  if (authorization === 'Bearer fixture-south') return 'south'
  throw fault(401, 'unauthenticated')
}

export function createStore({ retention = 20 } = {}) {
  if (!Number.isInteger(retention) || retention < 1) throw new Error('invalid_retention')
  const rows = new Map([
    ['north:o1', { id: 'o1', status: 'pending', version: 1, customerId: 'c1' }],
    ['north:o2', { id: 'o2', status: 'pending', version: 1, customerId: 'c2' }],
    ['north:o3', { id: 'o3', status: 'pending', version: 1, customerId: 'c1' }],
    ['south:o1', { id: 'o1', status: 'cancelled', version: 1, customerId: 'c1' }],
  ])
  const histories = new Map()
  const listeners = new Map()
  const keyOf = (tenant, id) => `${tenant}:${id}`
  function get(tenant, id) {
    const row = rows.get(keyOf(tenant, id))
    if (!row) throw fault(404, 'not_found')
    return { id: row.id, status: row.status, version: row.version }
  }
  return {
    get,
    list(tenant) {
      return [...rows]
        .filter(([key]) => key.startsWith(`${tenant}:`))
        .map(([, row]) => ({ ...row }))
    },
    change(tenant, id, status) {
      if (!statuses.has(status)) throw fault(400, 'invalid_status')
      const key = keyOf(tenant, id)
      get(tenant, id)
      const row = rows.get(key)
      if (row.status === status) return get(tenant, id)
      row.status = status
      row.version++
      const event = Object.freeze({
        schemaVersion: 1,
        orderId: id,
        version: row.version,
        status,
      })
      const history = histories.get(key) ?? []
      history.push(event)
      if (history.length > retention) history.shift()
      histories.set(key, history)
      for (const notify of listeners.get(key) ?? []) notify(event)
      return get(tenant, id)
    },
    subscribe(tenant, id, after, notify) {
      const snapshot = get(tenant, id)
      if (!Number.isSafeInteger(after) || after < 1 || after > snapshot.version)
        throw fault(400, 'invalid_cursor')
      const key = keyOf(tenant, id)
      const history = histories.get(key) ?? []
      if (after < snapshot.version && after < history[0].version - 1)
        throw fault(410, 'resnapshot_required')
      // No await: replay and registration share one synchronous turn.
      for (const event of history) if (event.version > after) notify(event)
      const set = listeners.get(key) ?? new Set()
      set.add(notify)
      listeners.set(key, set)
      return () => {
        set.delete(notify)
        if (!set.size) listeners.delete(key)
      }
    },
  }
}

export function applyEvent(current, event) {
  if (
    event?.schemaVersion !== 1 ||
    event.orderId !== current.id ||
    !Number.isSafeInteger(event.version) ||
    event.version < 1 ||
    !statuses.has(event.status)
  )
    throw new Error('invalid_event')
  if (event.version <= current.version) return current
  if (event.version !== current.version + 1) throw new Error('resnapshot_required')
  return { id: current.id, status: event.status, version: event.version }
}
