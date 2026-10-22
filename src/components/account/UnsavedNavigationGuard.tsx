import { useBlocker } from '@tanstack/react-router'
import { useSession } from '@/hooks/useSession'
import { readToken } from '@/services/session'
import { UnsavedChangesDialog } from './UnsavedChangesDialog'

export function UnsavedNavigationGuard({ dirty }: { dirty: boolean }) {
  const { session } = useSession()
  const blocker = useBlocker({
    shouldBlockFn: ({ current, next }) =>
      dirty &&
      current.pathname !== next.pathname &&
      Boolean(session && readToken() === session.token),
    withResolver: true,
    enableBeforeUnload: false,
  })
  return (
    <UnsavedChangesDialog
      open={blocker.status === 'blocked'}
      onKeepEditing={() => blocker.reset?.()}
      onDiscard={() => blocker.proceed?.()}
    />
  )
}
