export const selections = {
  lambdaRequest: ['AWSLambda', 'GU2ZS9HVP6QTQ7KE', 'GU2ZS9HVP6QTQ7KE.JRTCKXETXF.6YS6EN2CT7', 'Requests'],
  lambdaGbSecond: ['AWSLambda', 'TG3M4CAGBA3NYQBH', 'TG3M4CAGBA3NYQBH.JRTCKXETXF.CUKFZ388N3', 'Lambda-GB-Second'],
  httpApiRequest: ['AmazonApiGateway', 'FC2TWT2UEPTBKVBX', 'FC2TWT2UEPTBKVBX.JRTCKXETXF.9NXBCPDZYR', 'Requests'],
  fargateVcpuHour: ['AmazonECS', '8CESGAFWKAJ98PME', '8CESGAFWKAJ98PME.JRTCKXETXF.6YS6EN2CT7', 'hours'],
  fargateGbHour: ['AmazonECS', 'PBZNQUSEXZUC34C9', 'PBZNQUSEXZUC34C9.JRTCKXETXF.6YS6EN2CT7', 'hours'],
  albHour: ['AWSELB', '37CUWUT8GSNQEPUV', '37CUWUT8GSNQEPUV.JRTCKXETXF.6YS6EN2CT7', 'Hrs'],
  albLcuHour: ['AWSELB', 'P2XGEJ8N3KU52WA8', 'P2XGEJ8N3KU52WA8.JRTCKXETXF.6YS6EN2CT7', 'LCU-Hrs'],
  endpointAzHour: ['AmazonVPC', 'EN2N5TATXE673A3B', 'EN2N5TATXE673A3B.JRTCKXETXF.6YS6EN2CT7', 'Hrs'],
  endpointGb: ['AmazonVPC', 'DQYYEZBCWSW5XS2R', 'DQYYEZBCWSW5XS2R.JRTCKXETXF.D7RZ6WCPVW', 'GB'],
  publicIpv4Hour: ['AmazonVPC', '4GQUNXTFWVSGPUZK', '4GQUNXTFWVSGPUZK.JRTCKXETXF.6YS6EN2CT7', 'Hrs'],
}
export function extractRates(excerpts) {
  const rates = {}
  for (const [key, [service, sku, code, unit]] of Object.entries(selections)) {
    const record = excerpts.sources.find((s) => s.service === service)?.selected.find((r) => r.product.sku === sku && r.dimension.rateCode === code)
    if (!record || record.product.attributes.regionCode !== 'us-east-1' || record.dimension.unit !== unit
      || record.dimension.beginRange !== '0' || !/^\d+(?:\.\d+)?$/.test(record.dimension.pricePerUnit.USD)) throw Error(`pricing_dimension_changed:${key}`)
    rates[key] = Number(record.dimension.pricePerUnit.USD)
  }
  return rates
}
