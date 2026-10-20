import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { emailSchema } from '@/schemas/email'

export function HomePage() {
  const { t } = useTranslation(['common', 'validation'])
  const [result, setResult] = useState<'invalidEmail' | 'validEmail' | null>(
    null,
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const parsed = emailSchema.safeParse({ email: form.get('email') })
    setResult(parsed.success ? 'validEmail' : 'invalidEmail')
  }

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">{t('common:title')}</h1>
      <p>{t('common:description')}</p>
      <form
        noValidate
        onSubmit={handleSubmit}
        className="max-w-lg space-y-4 rounded-md border border-border p-5"
      >
        <h2 className="text-xl font-semibold">{t('validation:title')}</h2>
        <p className="text-sm leading-relaxed">{t('validation:description')}</p>
        <label htmlFor="email" className="block">
          {t('validation:email')}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={result === 'invalidEmail'}
          aria-describedby={result ? 'email-feedback' : undefined}
          onChange={() => setResult(null)}
          className="min-h-11 w-full rounded-md border border-border bg-background px-3 py-2"
        />
        <Button type="submit">{t('validation:submit')}</Button>
        <div aria-live="polite" aria-atomic="true">
          {result && <p id="email-feedback">{t(`validation:${result}`)}</p>}
        </div>
      </form>
    </section>
  )
}
