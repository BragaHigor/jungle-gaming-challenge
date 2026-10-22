import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CartContext, useCartController } from '@/hooks/useCart'
import { useSession } from '@/hooks/useSession'

function UserCart({ children }: { children: ReactNode }) {
  const value = useCartController()
  const { t } = useTranslation('purchase')
  const action = value.mutation.variables?.action.type
  const showError = value.mutation.isError && action === 'add'
  return (
    <CartContext.Provider value={value}>
      {children}
      {showError && (
        <div
          role="alert"
          className="fixed top-3 left-1/2 z-90 w-[min(30rem,calc(100%_-_2rem))] -translate-x-1/2 rounded-md border border-destructive bg-surface p-4 text-sm text-destructive"
        >
          <p>{t('cartWriteError')}</p>
          <button
            type="button"
            className="mt-2 min-h-11 underline"
            onClick={() => value.mutation.reset()}
          >
            {t('closeNotice')}
          </button>
        </div>
      )}
    </CartContext.Provider>
  )
}
export function CartProvider({ children }: { children: ReactNode }) {
  const { session } = useSession()
  return <UserCart key={session?.token ?? 'visitor'}>{children}</UserCart>
}
