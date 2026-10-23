// V8 snapshot format is read by metadata, not by hard-coded field positions.
export function analyzeHeap(snapshot) {
  const { node_fields: fields, node_types: types, edge_fields: edgeFields, edge_types: edgeTypes } = snapshot.snapshot.meta
  const width = fields.length
  const at = (node, key) => snapshot.nodes[node * width + fields.indexOf(key)]
  const nodeType = (node) => types[fields.indexOf('type')][at(node, 'type')]
  const nodeName = (node) => snapshot.strings[at(node, 'name')]
  const count = snapshot.nodes.length / width
  let entries = 0
  let shallowBytes = 0
  let cache = -1
  const edgeStarts = []
  let edge = 0
  for (let node = 0; node < count; node++) {
    edgeStarts[node] = edge
    edge += at(node, 'edge_count') * edgeFields.length
    if (nodeType(node) === 'object' && nodeName(node) === 'RetainedEntry') {
      entries++; shallowBytes += at(node, 'self_size')
    }
    if (nodeType(node) === 'object' && nodeName(node) === 'LabCache') cache = node
  }
  const queue = cache === -1 ? [] : [cache]
  const paths = new Map(cache === -1 ? [] : [[cache, ['LabCache']]])
  let path = null
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const node = queue[cursor]
    if (nodeType(node) === 'object' && nodeName(node) === 'RetainedEntry') { path = paths.get(node); break }
    const start = edgeStarts[node]
    for (let offset = start; offset < start + at(node, 'edge_count') * edgeFields.length; offset += edgeFields.length) {
      const kind = edgeTypes[edgeFields.indexOf('type')][snapshot.edges[offset + edgeFields.indexOf('type')]]
      if (kind !== 'property' && kind !== 'element') continue
      const target = snapshot.edges[offset + edgeFields.indexOf('to_node')] / width
      if (paths.has(target)) continue
      const rawName = snapshot.edges[offset + edgeFields.indexOf('name_or_index')]
      const label = kind === 'element' ? `[${rawName}]` : snapshot.strings[rawName]
      paths.set(target, [...paths.get(node), `${label} → ${nodeName(target)}`])
      queue.push(target)
    }
  }
  return { entries, shallowBytes, pathFromCache: path }
}
