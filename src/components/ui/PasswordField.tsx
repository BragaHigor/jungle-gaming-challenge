import { useState, type ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from './input'
import { Icon } from './Icon'

export function PasswordField(props: Omit<ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = useState(false)
  const { t } = useTranslation()
  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`pr-14 ${props.className ?? ''}`}
      />
      <button
        type="button"
        className="icon-button absolute top-0 right-1"
        aria-label={t(visible ? 'hidePassword' : 'showPassword')}
        aria-pressed={visible}
        aria-controls={props.id}
        onClick={() => setVisible(!visible)}
      >
        <Icon name={visible ? 'eyeOff' : 'eye'} />
      </button>
    </div>
  )
}
