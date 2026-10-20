import {
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { App } from './App'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PageHeading } from '@/pages/PageHeading'
import { homeCards } from '@/mocks/presentation'

const rootRoute = createRootRoute({
  component: App,
  notFoundComponent: NotFoundPage,
})
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <HomePage cards={homeCards} />,
})

export const router = createRouter({
  routeTree: rootRoute.addChildren([
    homeRoute,
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/nfts/$nftId',
      component: () => <PageHeading title="nftTitle" />,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/cart',
      component: () => <PageHeading title="cartTitle" />,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/checkout',
      component: () => <PageHeading title="checkoutTitle" />,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/confirmation',
      component: () => <PageHeading title="confirmationTitle" />,
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
