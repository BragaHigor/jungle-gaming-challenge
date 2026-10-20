import {
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { App } from './App'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'

const rootRoute = createRootRoute({
  component: App,
  notFoundComponent: NotFoundPage,
})
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
})

export const router = createRouter({
  routeTree: rootRoute.addChildren([homeRoute]),
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
