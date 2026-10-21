import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { i18n } from '@/i18n'
import { prepareApp } from './app/startup'
import { queryClient } from './app/query-client'
import { router } from './app/router'
import './styles/global.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Elemento raiz da aplicação não encontrado.')
}

const root = createRoot(container)

prepareApp()
  .then(() =>
    root.render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </StrictMode>,
    ),
  )
  .catch(() =>
    root.render(
      <main className="p-8 text-center">
        <h1 role="alert">{i18n.t('demo:startupError')}</h1>
        <button
          type="button"
          className="mt-6 min-h-11 border border-primary px-4"
          onClick={() => location.reload()}
        >
          {i18n.t('demo:retry')}
        </button>
      </main>,
    ),
  )
