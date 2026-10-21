import { useEffect, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  catalogSearchSchema,
  type CatalogSearch,
} from '@/schemas/catalog-search'
import { useCatalogQuery } from './useNftQueries'
import type {
  CatalogSort,
  CatalogTab,
  Category,
  Network,
} from '@/types/catalog'
import { centiEth, ethToWei, weiToEth } from '@/utils/eth'

export function useCatalog() {
  const search = catalogSearchSchema.parse(useSearch({ strict: false }))
  const navigate = useNavigate()
  const result = useCatalogQuery(search)
  const [facets, setFacets] = useState(result.data?.facets)
  const receivedFacets = result.data?.facets
  if (receivedFacets && receivedFacets !== facets) {
    setFacets(receivedFacets)
  }
  const page = search.page ?? 1
  const pageCount = Math.max(1, Math.ceil((result.data?.total ?? 0) / 9))
  useEffect(() => {
    if (!result.isSuccess || result.isPlaceholderData || page <= pageCount)
      return
    void navigate({
      to: '/',
      search: (previous: CatalogSearch) => ({ ...previous, page: pageCount }),
      replace: true,
      resetScroll: false,
    })
  }, [navigate, page, pageCount, result.isSuccess, result.isPlaceholderData])
  const appliedPrice: [number, number] = [
    Math.round(Number(search.min ?? '0.02') * 100),
    Math.round(Number(search.max ?? '12.3') * 100),
  ]
  const priceKey = `${search.min}:${search.max}`
  const [draft, setDraft] = useState<{
    key: string
    value: [number, number]
  } | null>(null)
  const price = draft?.key === priceKey ? draft.value : appliedPrice
  const update = (patch: Partial<CatalogSearch>) => {
    void navigate({
      to: '/',
      search: (previous: CatalogSearch) => ({
        ...previous,
        page: undefined,
        ...patch,
      }),
      resetScroll: false,
    })
  }
  const selectedCategories = search.categories ?? []
  const selectedNetworks = search.networks ?? []
  const toggleCategory = (category: Category) =>
    update({
      categories: selectedCategories.includes(category)
        ? selectedCategories.filter((value) => value !== category)
        : [...selectedCategories, category].sort(),
    })
  const toggleNetwork = (network: Network) =>
    update({
      networks: selectedNetworks.includes(network)
        ? selectedNetworks.filter((value) => value !== network)
        : [...selectedNetworks, network].sort(),
    })
  const reset = () => {
    setDraft(null)
    void navigate({ to: '/', search: {}, resetScroll: false })
  }
  return {
    result,
    query: search.q ?? '',
    setQuery: (q: string) => update({ q: q || undefined }),
    selectedCategories,
    selectedNetworks,
    toggleCategory,
    toggleNetwork,
    price,
    setPrice: (value: [number, number]) => setDraft({ key: priceKey, value }),
    applyPrice: () =>
      update({
        min: weiToEth(ethToWei(centiEth(price[0]))),
        max: weiToEth(ethToWei(centiEth(price[1]))),
      }),
    tab: search.tab ?? 'all',
    setTab: (tab: CatalogTab) => update({ tab }),
    sort: search.sort ?? 'recent',
    setSort: (sort: CatalogSort) => update({ sort }),
    page,
    setPage: (page: number) => update({ page }),
    pageCount,
    total: result.data?.total ?? 0,
    visible: result.data?.items ?? [],
    facets: receivedFacets ?? facets,
    reset,
    explore: (tab: CatalogTab, category?: Category) => {
      setDraft(null)
      void navigate({
        to: '/',
        search: { tab, categories: category ? [category] : undefined },
        hash: 'marketplace',
      })
    },
  }
}
export type CatalogControls = ReturnType<typeof useCatalog>
