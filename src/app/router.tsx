import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router'
import { SessionError } from '@/components/account/SessionError'
import { App } from './App'
import { catalogSearchSchema } from '@/schemas/catalog-search'
import { HomeRoute, NftRoute } from './CatalogRoutes'
import { CartRoute, CheckoutRoute } from './PurchaseRoutes'
import { ConfirmationPage } from '@/pages/ConfirmationPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import {
  LoginRoute,
  RegistrationRoute,
  ProfileRoute,
  WalletsRoute,
} from './AccountRoutes'
import { queryClient } from './query-client'
import { sessionOptions, safeReturn, readToken } from '@/services/session'
import { authSearchSchema } from '@/schemas/account'
import { parseSearch, stringifySearch } from '@/utils/search'

const requireAccount = async ({ location }: { location: { href: string } }) => {
  const hadToken = Boolean(readToken())
  const session = await queryClient.fetchQuery(sessionOptions())
  if (!session)
    throw redirect({
      to: '/login',
      search: {
        redirect: safeReturn(location.href),
        reason: hadToken ? 'expired' : undefined,
      },
    })
}

const rootRoute = createRootRoute({
  component: App,
  errorComponent: SessionError,
  notFoundComponent: NotFoundPage,
})
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search) => catalogSearchSchema.parse(search),
  component: HomeRoute,
})

const nftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nfts/$nftId',
  component: NftRoute,
})

export const router = createRouter({
  parseSearch,
  stringifySearch,
  scrollRestoration: true,
  getScrollRestorationKey: (location) => location.href,
  routeTree: rootRoute.addChildren([
    homeRoute,
    nftRoute,
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/cart',
      component: CartRoute,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/checkout',
      beforeLoad: requireAccount,
      component: CheckoutRoute,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/confirmation',
      beforeLoad: requireAccount,
      component: ConfirmationPage,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/login',
      validateSearch: (search) => authSearchSchema.parse(search),
      component: LoginRoute,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/register',
      validateSearch: (search) => authSearchSchema.parse(search),
      component: RegistrationRoute,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/profile',
      beforeLoad: requireAccount,
      validateSearch: () => ({}),
      component: ProfileRoute,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/wallets',
      beforeLoad: requireAccount,
      validateSearch: () => ({}),
      component: WalletsRoute,
    }),
  ]),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
