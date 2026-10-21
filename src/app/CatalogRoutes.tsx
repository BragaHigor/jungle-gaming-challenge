import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { HomePage } from '@/pages/HomePage'
import { NftPage } from '@/pages/NftPage'
import { useCatalogQuery, useNftQuery } from '@/hooks/useNftQueries'
import { QueryFeedback } from '@/components/shared/QueryFeedback'
import { ApiError } from '@/api/client'

const nftApi = getRouteApi('/nfts/$nftId')

export function HomeRoute() {
  return <HomePage />
}

export function NftRoute() {
  const { nftId } = nftApi.useParams()
  const navigate = useNavigate()
  const detail = useNftQuery(nftId)
  const related = useCatalogQuery({ pageSize: 6 })
  const notFound =
    detail.error instanceof ApiError && detail.error.status === 404
  const loading = detail.isPending ? 'loading' : 'ready'
  const failed = detail.isError && !detail.data ? 'error' : loading
  const state = notFound ? 'unavailable' : failed
  return (
    <>
      <QueryFeedback query={detail} />
      <NftPage
        key={nftId}
        nft={detail.data}
        related={(related.data?.items ?? []).filter(
          (card) => card.id !== nftId,
        )}
        state={state}
        onRetry={() => {
          if (notFound) void navigate({ to: '/' })
          else void detail.refetch()
        }}
      />
    </>
  )
}
