import { buildSchema, graphql, GraphQLError } from 'graphql'
import DataLoader from 'dataloader'

export const schema = buildSchema(`
  type Customer {
    id: ID!
    name: String!
  }
  type Order {
    id: ID!
    status: String!
    version: Int!
    customer: Customer!
  }
  type Query {
    orders(first: Int!): [Order!]!
  }
`)
export const ORDERS_QUERY = `query Orders($first: Int!) {
  orders(first: $first) { id status version customer { id name } }
}`

export function createRepository(store) {
  const counts = { orderReads: 0, customerReads: 0 }
  const customers = new Map([
    ['north:c1', { id: 'c1', name: 'Ana' }],
    ['north:c2', { id: 'c2', name: 'Bea' }],
    ['south:c1', { id: 'c1', name: 'Otro cliente' }],
  ])
  return {
    counts,
    async orders(tenant, first) {
      counts.orderReads++
      return store.list(tenant).slice(0, first)
    },
    async customer(tenant, id) {
      counts.customerReads++
      return customers.get(`${tenant}:${id}`) ?? null
    },
    async customers(tenant, ids) {
      counts.customerReads++
      // Deliberately reversed: the loader must restore requested-key order.
      return [...ids]
        .reverse()
        .map((id) => customers.get(`${tenant}:${id}`))
        .filter(Boolean)
    },
  }
}

export function runQuery(repo, tenant, source, variableValues = {}, batched = true) {
  // A new loader for EVERY operation: never share cached rows across tenants.
  const loader = new DataLoader(async (ids) => {
    const rows = await repo.customers(tenant, ids)
    const byId = new Map(rows.map((row) => [row.id, row]))
    return ids.map((id) => byId.get(id) ?? null)
  })
  const contextValue = {
    customer: (id) => (batched ? loader.load(id) : repo.customer(tenant, id)),
  }
  return graphql({
    schema,
    source,
    variableValues,
    contextValue,
    rootValue: {
      async orders({ first }, context) {
        if (!Number.isInteger(first) || first < 1 || first > 3)
          throw new GraphQLError('first_out_of_range')
        const rows = await repo.orders(tenant, first)
        return rows.map((row) => ({
          ...row,
          customer: () => context.customer(row.customerId),
        }))
      },
    },
  })
}
