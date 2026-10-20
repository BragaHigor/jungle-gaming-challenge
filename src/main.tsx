import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import '@/i18n'
import { queryClient } from './app/query-client'
import { router } from './app/router'
import './styles/global.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Elemento raiz da aplicação não encontrado.')
}

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
