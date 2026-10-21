import {
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { App } from './App'
import { HomeRoute, NftRoute } from './CatalogRoutes'
import { CartRoute, CheckoutRoute } from './PurchaseRoutes'
import { ConfirmationPage } from '@/pages/ConfirmationPage'
import { presentationSearchSchema } from '@/schemas/presentation'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PageHeading } from '@/pages/PageHeading'

const rootRoute = createRootRoute({
  component: App,
  notFoundComponent: NotFoundPage,
})
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search) => presentationSearchSchema.parse(search),
  component: HomeRoute,
})

const nftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nfts/$nftId',
  validateSearch: (search) => presentationSearchSchema.parse(search),
  component: NftRoute,
})

export const router = createRouter({
  routeTree: rootRoute.addChildren([
    homeRoute,
    nftRoute,
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/cart',
      validateSearch: (search) => presentationSearchSchema.parse(search),
      component: CartRoute,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/checkout',
      component: CheckoutRoute,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/confirmation',
      component: ConfirmationPage,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/login',
      component: () => <PageHeading title="loginTitle" />,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/register',
      component: () => <PageHeading title="registerTitle" />,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/profile',
      component: () => <PageHeading title="profileTitle" />,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/wallets',
      component: () => <PageHeading title="walletsTitle" />,
    }),
  ]),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
