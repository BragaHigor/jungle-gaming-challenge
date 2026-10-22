import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  lazyRouteComponent,
} from '@tanstack/react-router'
import { SessionError } from '@/components/account/SessionError'
import { App } from './App'
import { catalogSearchSchema } from '@/schemas/catalog-search'
import { HomeRoute, NftRoute } from './CatalogRoutes'
import { NotFoundPage } from '@/pages/NotFoundPage'
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
      component: lazyRouteComponent(
        () => import('./PurchaseRoutes'),
        'CartRoute',
      ),
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/checkout',
      beforeLoad: requireAccount,
      component: lazyRouteComponent(
        () => import('./PurchaseRoutes'),
        'CheckoutRoute',
      ),
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/confirmation',
      validateSearch: (search: Record<string, unknown>) => ({
        orderId:
          typeof search.orderId === 'string' &&
          /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,95}$/.test(search.orderId)
            ? search.orderId
            : undefined,
      }),
      beforeLoad: requireAccount,
      component: lazyRouteComponent(
        () => import('@/pages/ConfirmationPage'),
        'ConfirmationPage',
      ),
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/login',
      validateSearch: (search) => authSearchSchema.parse(search),
      component: lazyRouteComponent(
        () => import('./AccountRoutes'),
        'LoginRoute',
      ),
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/register',
      validateSearch: (search) => authSearchSchema.parse(search),
      component: lazyRouteComponent(
        () => import('./AccountRoutes'),
        'RegistrationRoute',
      ),
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/profile',
      beforeLoad: requireAccount,
      validateSearch: () => ({}),
      component: lazyRouteComponent(
        () => import('./AccountRoutes'),
        'ProfileRoute',
      ),
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/wallets',
      beforeLoad: requireAccount,
      validateSearch: () => ({}),
      component: lazyRouteComponent(
        () => import('./AccountRoutes'),
        'WalletsRoute',
      ),
    }),
  ]),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
