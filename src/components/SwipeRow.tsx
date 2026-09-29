import { useSwipeRow } from '../gestures'

/**
 * A list row with an iOS swipe action behind it. The action sits under the
 * row and is revealed by dragging, so it costs nothing until wanted and can't
 * be hit by accident — which is why destructive actions live here rather than
 * as a visible button on every row.
 *
 * Deletes still take two taps: swipe reveals, first tap arms, second confirms.
 */
export function SwipeRow({
  children,
  actionLabel = 'Delete',
  armedLabel = 'Sure?',
  armed,
  onAction
}: {
  children: React.ReactNode
  actionLabel?: string
  armedLabel?: string
  armed: boolean
  onAction: () => void
}) {
  const swipe = useSwipeRow()

  return (
    <div className="swipe-row">
      <button
        className={`swipe-action${armed ? ' armed' : ''}`}
        style={{ width: swipe.actionWidth }}
        tabIndex={swipe.open ? 0 : -1}
        aria-hidden={!swipe.open}
        onClick={() => {
          onAction()
          if (armed) swipe.close()
        }}
      >
        {armed ? armedLabel : actionLabel}
      </button>
      <div className="swipe-face" style={swipe.style} {...swipe.handlers}>
        {children}
      </div>
    </div>
  )
}
