import { DemoControls } from '@/components/demo/DemoControls'
import { useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { emailSchema } from '@/schemas/email'
import { UnavailableAction } from '@/components/shared/UnavailableAction'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Icon } from '@/components/ui/Icon'

const benefits = [
  { mark: 'W', title: 'walletSecurity', text: 'walletSecurityText' },
  { mark: 'C', title: 'creators', text: 'creatorsText' },
  { mark: 'D', title: 'drops', text: 'dropsText' },
] as const
const helpLinks = ['help', 'buying', 'security', 'policy', 'report'] as const
const collectionLinks = [
  'digitalArt',
  'photography',
  'music',
  'art3d',
  'utility',
] as const
const socialLinks = [
  { icon: 'facebook', label: 'Facebook' },
  { icon: 'instagram', label: 'Instagram' },
  { icon: 'twitter', label: 'Twitter' },
  { icon: 'linkedin', label: 'LinkedIn' },
  { icon: 'youtube', label: 'YouTube' },
] as const

export function Footer() {
  const { t } = useTranslation('footer')
  const [feedback, setFeedback] = useState<
    'invalidEmail' | 'newsletterUnavailable' | null
  >(null)

  function handleNewsletter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = emailSchema.safeParse({
      email: new FormData(event.currentTarget).get('email'),
    })
    setFeedback(parsed.success ? 'newsletterUnavailable' : 'invalidEmail')
  }

  return (
    <footer className="site-footer mt-[var(--section-gap)] max-tablet:mt-16 page-container w-full max-w-[calc(var(--content-width)_+_var(--page-gutter)_*_2)] ml-auto mr-auto pl-[var(--page-gutter)] pr-[var(--page-gutter)]">
      <div className="footer-box bg-surface">
        <div className="footer-features grid grid-cols-[repeat(3,_minmax(0,_1fr))_minmax(0,_1.3fr)] gap-6 pt-8 pr-8 pb-6 pl-12 max-desktop:grid-cols-3 max-desktop:pt-7 max-desktop:pr-7 max-desktop:pb-7 max-desktop:pl-7 max-tablet:grid-cols-1 max-tablet:pt-6 max-tablet:pr-6 max-tablet:pb-6 max-tablet:pl-6">
          {benefits.map((benefit) => (
            <section
              className="footer-feature flex flex-col gap-3 pr-6 border-r border-r-primary max-desktop:[&:nth-child(3)]:border-r-0 max-desktop:[&:nth-child(3)]:pr-0 max-tablet:pt-0 max-tablet:pr-0 max-tablet:pb-6 max-tablet:pl-0 max-tablet:border-r-0 max-tablet:border-b max-tablet:border-b-primary max-tablet:[&:nth-child(3)]:pt-0 max-tablet:[&:nth-child(3)]:pr-0 max-tablet:[&:nth-child(3)]:pb-6 max-tablet:[&:nth-child(3)]:pl-0 max-tablet:[&:nth-child(3)]:border-r-0 max-tablet:[&:nth-child(3)]:border-b max-tablet:[&:nth-child(3)]:border-b-primary"
              key={benefit.mark}
            >
              <span
                className="footer-feature__mark grid place-items-center w-18.5 h-18.5 shrink-0 rounded-full bg-primary text-background text-[1.25rem] font-bold max-tablet:w-14 max-tablet:h-14"
                aria-hidden="true"
              >
                {benefit.mark}
              </span>
              <h2 className="text-[1rem] leading-[1.25] font-bold mt-1">
                {t(benefit.title)}
              </h2>
              <p className="text-primary-hover leading-[1.6]">
                {t(benefit.text)}
              </p>
            </section>
          ))}
          <form
            noValidate
            onSubmit={handleNewsletter}
            className="newsletter flex flex-col gap-3 min-w-0 max-desktop:col-span-full"
          >
            <h2 className="text-[1rem] leading-[1.25] font-bold">
              <label htmlFor="newsletter-email">{t('newsletter')}</label>
            </h2>
            <div className="newsletter__row flex min-w-0">
              <Input
                className="border border-transparent rounded-l-sm rounded-r-none bg-surface-band min-w-0 text-[0.8125rem] [&[aria-invalid='true']]:border-destructive"
                id="newsletter-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                aria-label={t('email')}
                aria-invalid={feedback === 'invalidEmail'}
                aria-describedby={feedback ? 'newsletter-feedback' : undefined}
                placeholder={t('emailPlaceholder')}
                onChange={() => setFeedback(null)}
              />
              <Button
                className="shrink-0 whitespace-nowrap rounded-l-none rounded-r-sm pl-3 pr-3 text-[1rem]"
                type="submit"
              >
                {t('send')}
              </Button>
            </div>
            <div aria-live="polite" aria-atomic="true">
              {feedback && (
                <p
                  id="newsletter-feedback"
                  className={
                    feedback === 'invalidEmail'
                      ? 'text-destructive'
                      : 'text-secondary'
                  }
                >
                  {t(feedback)}
                </p>
              )}
            </div>
            <p className="newsletter__description text-primary-hover text-[0.8125rem] leading-[1.7]">
              {t('newsletterText')}
            </p>
          </form>
        </div>
        <div className="footer-band grid grid-cols-4 gap-4 items-center pt-6 pr-8 pb-6 pl-8 bg-surface-band max-desktop:grid-cols-2 max-tablet:grid-cols-1 max-tablet:pt-6 max-tablet:pr-6 max-tablet:pb-6 max-tablet:pl-6">
          <Link
            to="/"
            className="brand text-foreground text-[0.875rem] font-bold tracking-[0.1em] hover:text-primary-hover"
          >
            KURIO
          </Link>
          <p>{t('tagline')}</p>
          <UnavailableAction className="min-h-11 text-left wrap-anywhere">
            contato@email.com
          </UnavailableAction>
          <UnavailableAction className="min-h-11 text-left wrap-anywhere">
            +55 11 4002 8922
          </UnavailableAction>
        </div>
        <div className="footer-columns grid grid-cols-4 gap-6 pt-8 pr-8 pb-10 pl-8 [&_li_a]:inline-block [&_li_a]:pt-1.5 [&_li_a]:pb-1.5 [&_li_a]:text-left [&_li>button]:inline-block [&_li>button]:pt-1.5 [&_li>button]:pb-1.5 [&_li>button]:text-left max-desktop:grid-cols-2 max-tablet:grid-cols-1 max-tablet:pt-6 max-tablet:pr-6 max-tablet:pb-6 max-tablet:pl-6 max-tablet:[&_li_a]:min-h-11 max-tablet:[&_li_a]:pt-3 max-tablet:[&_li_a]:pb-3 max-tablet:[&_li>button]:min-h-11 max-tablet:[&_li>button]:pt-3 max-tablet:[&_li>button]:pb-3">
          <section>
            <h2 className="mb-2 text-[1.125rem] font-bold">{t('profile')}</h2>
            <ul>
              <li>
                <Link className="hover:text-primary-hover" to="/profile">
                  {t('profile')}
                </Link>
              </li>
              {(['collection', 'activity', 'studio', 'wishlist'] as const).map(
                (key) => (
                  <li key={key}>
                    <UnavailableAction className="hover:text-primary-hover">
                      {t(key)}
                    </UnavailableAction>
                  </li>
                ),
              )}
            </ul>
          </section>
          <section>
            <h2 className="mb-2 text-[1.125rem] font-bold">{t('help')}</h2>
            <ul>
              {helpLinks.map((key) => (
                <li key={key}>
                  <UnavailableAction className="hover:text-primary-hover">
                    {t(key)}
                  </UnavailableAction>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="mb-2 text-[1.125rem] font-bold">
              {t('collections')}
            </h2>
            <ul>
              {collectionLinks.map((key) => (
                <li key={key}>
                  <UnavailableAction className="hover:text-primary-hover">
                    {t(key)}
                  </UnavailableAction>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="mb-2 text-[1.125rem] font-bold">{t('social')}</h2>
            <ul className="social-links flex flex-wrap gap-2">
              {socialLinks.map(({ icon, label }) => (
                <li key={icon}>
                  <UnavailableAction
                    aria-label={label}
                    className="social-link inline-grid! place-items-center w-11 h-11 border border-primary rounded-sm text-primary-hover [&_svg]:w-5 [&_svg]:h-5 hover:text-primary-hover"
                  >
                    <Icon name={icon} />
                  </UnavailableAction>
                </li>
              ))}
            </ul>
            <h2 className="mt-6 mb-2 text-[1.125rem] font-bold">
              {t('wallets')}
            </h2>
            <p className="wallet-brands inline-block max-w-full pt-1 pr-2 pb-1 pl-2 border border-border rounded-sm bg-surface-band text-primary-hover text-[0.5rem] font-bold leading-[1.8]">
              METAMASK · WALLETCONNECT · COINBASE
            </p>
          </section>
        </div>
      </div>
      <div className="mt-5 text-center">
        <DemoControls />
      </div>
      <p className="copyright pt-5 pb-6 text-center">{t('copyright')}</p>
    </footer>
  )
}
