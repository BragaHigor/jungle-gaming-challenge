import { useTranslation } from 'react-i18next'

type PageTitle =
  | 'cartTitle'
  | 'checkoutTitle'
  | 'confirmationTitle'
  | 'loginTitle'
  | 'registerTitle'
  | 'profileTitle'
  | 'walletsTitle'
  | 'nftTitle'

export function PageHeading({ title }: { title: PageTitle }) {
  const { t } = useTranslation()
  return <h1 className="page-heading">{t(title)}</h1>
}
