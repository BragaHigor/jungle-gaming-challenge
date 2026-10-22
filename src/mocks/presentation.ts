import type { CatalogNft } from '@/types/catalog'

const firstPage: readonly CatalogNft[] = [
  {
    id: 'emerald-ape-042',
    title: 'Emerald Ape #042',
    image: '/images/nft-artwork-01.webp',
    imageAltKey: 'emeraldAlt',
    price: '1.19',
    category: 'digitalArt',
    network: 'Ethereum',
    isNew: true,
    hot: true,
    token: '0042',
  },
  {
    id: 'sage-nomad-009',
    title: 'Sage Nomad #009',
    image: '/images/nft-artwork-02.webp',
    imageAltKey: 'sageAlt',
    price: '1.69',
    category: 'photography',
    network: 'Polygon',
    isNew: true,
    hot: false,
    token: '0009',
  },
  {
    id: 'neon-vessel-552',
    title: 'Neon Vessel #552',
    image: '/images/nft-artwork-03.webp',
    imageAltKey: 'neonAlt',
    price: '1.99',
    previousPrice: '2.29',
    rare: true,
    category: 'art3d',
    network: 'Ethereum',
    isNew: false,
    hot: true,
    token: '0552',
  },
  {
    id: 'cosmic-bloom-118',
    title: 'Cosmic Bloom #118',
    image: '/images/nft-artwork-02.webp',
    imageAltKey: 'sageAlt',
    price: '1.29',
    category: 'generative',
    network: 'Solana',
    isNew: true,
    hot: false,
    token: '0118',
  },
  {
    id: 'violet-nomad-314',
    title: 'Violet Nomad #314',
    image: '/images/nft-artwork-02.webp',
    imageAltKey: 'sageAlt',
    price: '1.39',
    category: 'collectibles',
    network: 'Polygon',
    isNew: false,
    hot: true,
    token: '0314',
  },
  {
    id: 'ivory-baron-088',
    title: 'Ivory Baron #088',
    image: '/images/nft-artwork-03.webp',
    imageAltKey: 'neonAlt',
    price: '1.79',
    category: 'digitalArt',
    network: 'Ethereum',
    isNew: false,
    hot: false,
    token: '0088',
  },
  {
    id: 'golden-beat-207',
    title: 'Golden Beat #207',
    image: '/images/nft-artwork-04.webp',
    imageAltKey: 'goldenAlt',
    price: '0.99',
    category: 'music',
    network: 'Solana',
    isNew: true,
    hot: true,
    token: '0207',
  },
  {
    id: 'golden-frequency-071',
    title: 'Golden Frequency #071',
    image: '/images/nft-artwork-04.webp',
    imageAltKey: 'goldenAlt',
    price: '0.59',
    category: 'music',
    network: 'Polygon',
    isNew: false,
    hot: false,
    token: '0071',
  },
  {
    id: 'golden-signal-160',
    title: 'Golden Signal #160',
    image: '/images/nft-artwork-04.webp',
    imageAltKey: 'goldenAlt',
    price: '0.39',
    category: 'games',
    network: 'Ethereum',
    isNew: false,
    hot: true,
    token: '0160',
  },
]

const artworks = [firstPage[0], firstPage[1], firstPage[2], firstPage[6]].map(
  ({ image, imageAltKey }) => ({ image, imageAltKey }),
)

export const homeCards: readonly CatalogNft[] = [
  ...firstPage,
  ...Array.from({ length: 27 }, (_, index) => {
    const original = firstPage[index % firstPage.length]
    const token = String(600 + index)
    const pageOffset = Math.floor(index / firstPage.length) + 1
    const artworkIndex = artworks.findIndex(
      ({ image }) => image === original.image,
    )
    const artwork = artworks[(artworkIndex + pageOffset) % artworks.length]
    return {
      ...original,
      ...artwork,
      id: `${original.id}-${token}`,
      title: `${original.title.split(' #')[0]} #${token}`,
      token,
      previousPrice: undefined,
    }
  }),
]
