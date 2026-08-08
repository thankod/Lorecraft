import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import './AutoHideScrollArea.css'

type ScrollOrientation = 'vertical' | 'horizontal' | 'both'

interface AutoHideScrollAreaProps
  extends Omit<ComponentPropsWithoutRef<typeof ScrollArea.Root>, 'children' | 'type'> {
  children: ReactNode
  orientation?: ScrollOrientation
  viewportClassName?: string
}

function classNames(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(' ')
}

export function AutoHideScrollArea({
  children,
  className,
  orientation = 'vertical',
  scrollHideDelay = 500,
  viewportClassName,
  ...rootProps
}: AutoHideScrollAreaProps) {
  const hasVertical = orientation === 'vertical' || orientation === 'both'
  const hasHorizontal = orientation === 'horizontal' || orientation === 'both'

  return (
    <ScrollArea.Root
      {...rootProps}
      className={classNames('auto-hide-scroll-area', className)}
      type="hover"
      scrollHideDelay={scrollHideDelay}
    >
      <ScrollArea.Viewport className={classNames('auto-hide-scroll-viewport', viewportClassName)}>
        {children}
      </ScrollArea.Viewport>
      {hasVertical && (
        <ScrollArea.Scrollbar className="auto-hide-scrollbar" orientation="vertical">
          <ScrollArea.Thumb className="auto-hide-scroll-thumb" />
        </ScrollArea.Scrollbar>
      )}
      {hasHorizontal && (
        <ScrollArea.Scrollbar className="auto-hide-scrollbar" orientation="horizontal">
          <ScrollArea.Thumb className="auto-hide-scroll-thumb" />
        </ScrollArea.Scrollbar>
      )}
      {orientation === 'both' && <ScrollArea.Corner className="auto-hide-scroll-corner" />}
    </ScrollArea.Root>
  )
}
