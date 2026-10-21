import { useState } from 'react'
import type {
  CatalogNft,
  CatalogSort,
  CatalogTab,
  Category,
  Network,
} from '@/types/catalog'
import { centiEth, ethToWei } from '@/utils/eth'

const comparePrices = (first: string, second: string) => {
  const difference = ethToWei(first) - ethToWei(second)
  if (difference === 0n) return 0
  return difference < 0n ? -1 : 1
}

export function useCatalog(cards: readonly CatalogNft[], initialQuery = '') {
  const [query, setQuery] = useState(initialQuery)
  const [selectedCategories, setCategories] = useState<Category[]>([])
  const [selectedNetworks, setNetworks] = useState<Network[]>([])
  const [price, setPrice] = useState<[number, number]>([2, 1230])
  const [appliedPrice, setAppliedPrice] = useState<[number, number]>([2, 1230])
  const [tab, setTab] = useState<CatalogTab>('all')
  const [sort, setSort] = useState<CatalogSort>('recent')
  const [page, setPage] = useState(1)
  const update = <T>(setter: (value: T) => void, value: T) => {
    setter(value)
    setPage(1)
  }
  const toggleCategory = (category: Category) =>
    update(
      setCategories,
      selectedCategories.includes(category)
        ? selectedCategories.filter((value) => value !== category)
        : [...selectedCategories, category],
    )
  const toggleNetwork = (network: Network) =>
    update(
      setNetworks,
      selectedNetworks.includes(network)
        ? selectedNetworks.filter((value) => value !== network)
        : [...selectedNetworks, network],
    )
  const filtered = cards
    .filter(
      (card) =>
        card.title.toLowerCase().includes(query.trim().toLowerCase()) &&
        (!selectedCategories.length ||
          selectedCategories.includes(card.category)) &&
        (!selectedNetworks.length || selectedNetworks.includes(card.network)) &&
        (tab !== 'new' || card.isNew) &&
        (tab !== 'hot' || card.hot) &&
        ethToWei(card.price) >= ethToWei(centiEth(appliedPrice[0])) &&
        ethToWei(card.price) <= ethToWei(centiEth(appliedPrice[1])),
    )
    .sort((a, b) => {
      if (sort === 'recent') return 0
      if (sort === 'name') return a.title.localeCompare(b.title)
      const direction = sort === 'highest' ? -1 : 1
      return comparePrices(a.price, b.price) * direction
    })
  const pageCount = Math.max(1, Math.ceil(filtered.length / 9))
  const currentPage = Math.min(page, pageCount)
  const reset = () => {
    setQuery('')
    setCategories([])
    setNetworks([])
    setPrice([2, 1230])
    setAppliedPrice([2, 1230])
    setTab('all')
    setSort('recent')
    setPage(1)
  }
  return {
    query,
    setQuery: (value: string) => update(setQuery, value),
    selectedCategories,
    selectedNetworks,
    toggleCategory,
    toggleNetwork,
    price,
    setPrice,
    applyPrice: () => update(setAppliedPrice, price),
    tab,
    setTab: (value: CatalogTab) => update(setTab, value),
    sort,
    setSort: (value: CatalogSort) => update(setSort, value),
    page: currentPage,
    setPage,
    pageCount,
    total: filtered.length,
    visible: filtered.slice((currentPage - 1) * 9, currentPage * 9),
    reset,
    explore: (nextTab: CatalogTab, category?: Category) => {
      reset()
      setTab(nextTab)
      setCategories(category ? [category] : [])
    },
  }
}
export type CatalogControls = ReturnType<typeof useCatalog>
