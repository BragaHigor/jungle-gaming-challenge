import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { HomePage } from '@/pages/HomePage'
import { NftPage } from '@/pages/NftPage'
import { homeCards } from '@/mocks/presentation'

const homeApi = getRouteApi('/')
const nftApi = getRouteApi('/nfts/$nftId')

export function HomeRoute() {
  const search = homeApi.useSearch()
  const navigate = useNavigate()
  return (
    <HomePage
      key={search.q ?? ''}
      cards={homeCards}
      initialQuery={search.q}
      state={search.view}
      onRetry={() => void navigate({ to: '/', search: {} })}
    />
  )
}

export function NftRoute() {
  const { nftId } = nftApi.useParams()
  const { view } = nftApi.useSearch()
  const navigate = useNavigate()
  const nft = homeCards.find((card) => card.id === nftId)
  return (
    <NftPage
      key={nftId}
      nft={nft}
      related={[...homeCards.slice(3, 7), homeCards[8]].filter(
        (card) => card.id !== nftId,
      )}
      state={view}
      onRetry={() => {
        if (!nft) {
          void navigate({ to: '/' })
          return
        }
        void navigate({ to: '/nfts/$nftId', params: { nftId }, search: {} })
      }}
    />
  )
}
