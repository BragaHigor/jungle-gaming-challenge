import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/Icon'

export function SearchDialog() {
  const { t } = useTranslation(['navigation', 'catalog'])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="icon-button inline-grid place-items-center w-11 h-11 rounded-md text-inherit hover:text-primary-hover disabled:opacity-55 header-search max-tablet:hidden"
          aria-label={t('navigation:search')}
        >
          <Icon name="search" />
        </button>
      </DialogTrigger>
      <DialogContent
        title={t('navigation:search')}
        description={t('catalog:searchHelp')}
      >
        <form
          className="search-dialog-form flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            setOpen(false)
            void navigate({
              to: '/',
              search: { q: query },
              hash: 'marketplace',
            })
          }}
        >
          <label htmlFor="catalog-dialog-search">
            {t('navigation:search')}
          </label>
          <input
            type="search"
            id="catalog-dialog-search"
            className="field-control w-full min-h-11 pt-2 pr-3 pb-2 pl-3 border border-input rounded-sm bg-transparent text-foreground text-[0.875rem] placeholder:text-muted-foreground placeholder:opacity-100 [&[aria-invalid='true']]:border-destructive"
            maxLength={120}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button type="submit">{t('catalog:search')}</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
