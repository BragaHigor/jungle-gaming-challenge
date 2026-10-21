import { categories, networks } from '@/constants/catalog'
import { catalogQuerySchema, type Nft } from '@/schemas/api/catalog'
import { ethToWei } from '@/utils/eth'
import { parseInput } from './responses'
import { readDatabase } from './database'

const comparePrice = (left: Nft, right: Nft) => {
  const difference = ethToWei(left.price) - ethToWei(right.price)
  if (difference < 0n) return -1
  if (difference > 0n) return 1
  return left.id.localeCompare(right.id)
}
const comparators = {
  recent: (a: Nft, b: Nft) =>
    b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id),
  lowest: comparePrice,
  highest: (a: Nft, b: Nft) => -comparePrice(a, b),
  name: (a: Nft, b: Nft) =>
    a.title.localeCompare(b.title) || a.id.localeCompare(b.id),
}
function integerParam(value: string | undefined) {
  if (value === undefined) return undefined
  if (!/^[1-9][0-9]*$/.test(value)) return NaN
  return Number(value)
}
export async function listNfts(url: URL) {
  const params = Object.fromEntries(url.searchParams)
  const query = parseInput(catalogQuerySchema, {
    ...params,
    categories: url.searchParams
      .getAll('categories')
      .flatMap((value) => value.split(','))
      .filter(Boolean),
    networks: url.searchParams
      .getAll('networks')
      .flatMap((value) => value.split(','))
      .filter(Boolean),
    page: integerParam(params.page),
    pageSize: integerParam(params.pageSize),
  })
  const database = await readDatabase()
  const matches = database.nfts
    .filter((nft) => {
      if (database.scenario === 'empty') return false
      if (!nft.title.toLowerCase().includes(query.q.toLowerCase())) return false
      if (query.categories.length && !query.categories.includes(nft.category))
        return false
      if (query.networks.length && !query.networks.includes(nft.network))
        return false
      if (query.tab === 'new' && !nft.isNew) return false
      if (query.tab === 'hot' && !nft.hot) return false
      if (query.min && ethToWei(nft.price) < ethToWei(query.min)) return false
      if (query.max && ethToWei(nft.price) > ethToWei(query.max)) return false
      return true
    })
    .sort(comparators[query.sort])
  return {
    facets: {
      categories: Object.fromEntries(
        categories.map((category) => [
          category,
          database.nfts.filter((nft) => nft.category === category).length,
        ]),
      ),
      networks: Object.fromEntries(
        networks.map((network) => [
          network,
          database.nfts.filter((nft) => nft.network === network).length,
        ]),
      ),
    },
    items: matches.slice(
      (query.page - 1) * query.pageSize,
      query.page * query.pageSize,
    ),
    total: matches.length,
    page: query.page,
    pageSize: query.pageSize,
  }
}
