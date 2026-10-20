import { useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { emailSchema } from '@/schemas/email'
import { UnavailableAction } from '@/components/UnavailableAction'
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
    <footer className="site-footer page-container">
      <div className="footer-box">
        <div className="footer-features">
          {benefits.map((benefit) => (
            <section className="footer-feature" key={benefit.mark}>
              <span className="footer-feature__mark" aria-hidden="true">
                {benefit.mark}
              </span>
              <h2>{t(benefit.title)}</h2>
              <p>{t(benefit.text)}</p>
            </section>
          ))}
          <form noValidate onSubmit={handleNewsletter} className="newsletter">
            <h2>
              <label htmlFor="newsletter-email">{t('newsletter')}</label>
            </h2>
            <div className="newsletter__row">
              <Input
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
              <Button type="submit">{t('send')}</Button>
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
            <p className="newsletter__description">{t('newsletterText')}</p>
          </form>
        </div>
        <div className="footer-band">
          <Link to="/" className="brand">
            KURIO
          </Link>
          <p>{t('tagline')}</p>
          <UnavailableAction>contato@email.com</UnavailableAction>
          <UnavailableAction>+55 11 4002 8922</UnavailableAction>
        </div>
        <div className="footer-columns">
          <section>
            <h2>{t('profile')}</h2>
            <ul>
              <li>
                <Link to="/profile">{t('profile')}</Link>
              </li>
              {(['collection', 'activity', 'studio', 'wishlist'] as const).map(
                (key) => (
                  <li key={key}>
                    <UnavailableAction>{t(key)}</UnavailableAction>
                  </li>
                ),
              )}
            </ul>
          </section>
          <section>
            <h2>{t('help')}</h2>
            <ul>
              {helpLinks.map((key) => (
                <li key={key}>
                  <UnavailableAction>{t(key)}</UnavailableAction>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2>{t('collections')}</h2>
            <ul>
              {collectionLinks.map((key) => (
                <li key={key}>
                  <UnavailableAction>{t(key)}</UnavailableAction>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2>{t('social')}</h2>
            <ul className="social-links">
              {socialLinks.map(({ icon, label }) => (
                <li key={icon}>
                  <UnavailableAction aria-label={label} className="social-link">
                    <Icon name={icon} />
                  </UnavailableAction>
                </li>
              ))}
            </ul>
            <h2 className="mt-6">{t('wallets')}</h2>
            <p className="wallet-brands">METAMASK · WALLETCONNECT · COINBASE</p>
          </section>
        </div>
      </div>
      <p className="copyright">{t('copyright')}</p>
    </footer>
  )
}
