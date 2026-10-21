import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/utils/cn'

const crops = [
  { className: '[transform:scale(1)] origin-center', label: 'full' },
  { className: '[transform:scale(1.6)] origin-[50%_25%]', label: 'face' },
  { className: '[transform:scale(1.8)] origin-[50%_90%]', label: 'outfit' },
  { className: '[transform:scale(1.5)] origin-[20%_40%]', label: 'side' },
] as const

export function NftGallery({
  image,
  alt,
  title,
}: {
  image: string
  alt: string
  title: string
}) {
  const { t } = useTranslation('detail')
  const [selected, setSelected] = useState(0)
  function thumbnails(expanded = false) {
    return (
      <div
        className={cn(
          'nft-thumbnails flex gap-4',
          expanded ? 'flex-row gap-3' : 'flex-col',
        )}
        role="group"
        aria-label={t('gallery')}
      >
        {crops.map((crop, index) => (
          <button
            className={cn(
              'overflow-hidden rounded-2xl border-2 border-transparent bg-surface aria-pressed:border-primary',
              expanded ? 'aspect-square w-[calc((100%_-_36px)/4)]' : 'size-25',
            )}
            type="button"
            key={crop.label}
            aria-label={t(crop.label)}
            aria-pressed={selected === index}
            onClick={() => setSelected(index)}
          >
            <img
              className={cn('size-full object-cover', crop.className)}
              src={image}
              alt=""
              width="100"
              height="100"
            />
          </button>
        ))}
      </div>
    )
  }
  return (
    <div className="nft-gallery grid min-w-0 grid-cols-[100px_minmax(0,1fr)] gap-7 max-wide:tablet:mx-auto max-wide:tablet:w-full max-wide:tablet:max-w-155 max-tablet:block max-tablet:w-full">
      <div className="gallery-desktop-thumbs max-tablet:hidden">
        {thumbnails()}
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <button
            className="nft-gallery__main block w-full rounded-3xl bg-surface p-5 max-tablet:bg-transparent max-tablet:px-1 max-tablet:py-0"
            type="button"
            aria-label={t('enlarge', { title })}
          >
            <span className="block aspect-square overflow-hidden rounded-[20px] max-tablet:rounded-3xl">
              <img
                className={cn(
                  'size-full object-cover',
                  crops[selected].className,
                )}
                src={image}
                alt={alt}
                width="450"
                height="450"
                fetchPriority="high"
              />
            </span>
          </button>
        </DialogTrigger>
        <DialogContent title={title} description={t('galleryHelp')}>
          <div className="gallery-zoom aspect-square overflow-hidden rounded-2xl">
            <img
              className={cn(
                'size-full object-cover',
                crops[selected].className,
              )}
              src={image}
              alt={alt}
              width="600"
              height="600"
            />
          </div>
          {thumbnails(true)}
        </DialogContent>
      </Dialog>
    </div>
  )
}
