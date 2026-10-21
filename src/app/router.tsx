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
import {
  LoginRoute,
  RegistrationRoute,
  ProfileRoute,
  WalletsRoute,
} from './AccountRoutes'
import { accountSearchSchema } from '@/schemas/account'

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
  scrollRestoration: true,
  getScrollRestorationKey: (location) => location.href,
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
      validateSearch: (search) => accountSearchSchema.parse(search),
      component: LoginRoute,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/register',
      validateSearch: (search) => accountSearchSchema.parse(search),
      component: RegistrationRoute,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/profile',
      validateSearch: (search) => accountSearchSchema.parse(search),
      component: ProfileRoute,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/wallets',
      validateSearch: (search) => accountSearchSchema.parse(search),
      component: WalletsRoute,
    }),
  ]),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
