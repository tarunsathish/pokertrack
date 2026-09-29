import { useMemo } from 'react'
import { fmtSigned, type Cents } from '../engine/money'

/**
 * Cumulative bankroll line. The x-axis is session number, not wall-clock time:
 * poker results accrue per session, and time-spacing bunches a month of daily
 * play into a spike while stretching a quiet fortnight into a plateau.
 *
 * Drawn rather than charted — no library, no gradient, flat tint fill, hairline
 * zero baseline. It's the one hero visual on the Sessions tab, so it's real
 * content, not a sparkline standing in for content.
 */
export function BankrollChart({
  points,
  height = 168
}: {
  points: { ts: number; cum: Cents }[]
  height?: number
}) {
  // Coordinate space is viewBox units; the SVG stretches to the column width.
  const W = 320
  const PAD_T = 16
  const PAD_B = 18

  const geom = useMemo(() => {
    // Lead with the origin so the line starts at zero rather than at result #1.
    const series = [0, ...points.map((p) => p.cum)]
    // Always keep zero in frame, and never let a flat line divide by zero.
    const hi = Math.max(...series, 0)
    const lo = Math.min(...series, 0)
    const span = hi - lo || 1
    const innerH = height - PAD_T - PAD_B
    const x = (i: number) => (series.length === 1 ? 0 : (i / (series.length - 1)) * W)
    const y = (v: Cents) => PAD_T + ((hi - v) / span) * innerH

    const pts = series.map((v, i) => [x(i), y(v)] as const)
    const line = pts
      .map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(2)} ${py.toFixed(2)}`)
      .join(' ')
    const zeroY = y(0)
    const endX = pts[pts.length - 1][0]
    const area = `${line} L${endX.toFixed(2)} ${zeroY.toFixed(2)} L0 ${zeroY.toFixed(2)} Z`
    const last = series[series.length - 1]

    // The end marker is positioned in CSS rather than drawn: the chart stretches
    // to fill its column (preserveAspectRatio="none"), which would squash an SVG
    // circle into an ellipse. A percentage-positioned span stays round.
    return { line, area, zeroY, hi, lo, last, markerTopPct: (y(last) / height) * 100 }
  }, [points, height])

  const tint = geom.last >= 0 ? 'var(--win)' : 'var(--loss)'

  return (
    <figure className="bankroll">
      <div className="bankroll-plot" style={{ height }}>
        <svg
          viewBox={`0 0 ${W} ${height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Bankroll after ${points.length} session${
            points.length === 1 ? '' : 's'
          }: ${fmtSigned(geom.last)}`}
        >
          {/* zero baseline — the line that decides whether you're up or down */}
          <line
            x1="0"
            x2={W}
            y1={geom.zeroY}
            y2={geom.zeroY}
            stroke="var(--ink-4)"
            strokeWidth="1"
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
          <path d={geom.area} fill={tint} opacity="0.1" />
          <path
            d={geom.line}
            fill="none"
            stroke={tint}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {/* color drives the glow in .bankroll-dot's box-shadow (currentColor) */}
        <span
          className="bankroll-dot"
          style={{ top: `${geom.markerTopPct}%`, background: tint, color: tint }}
        />
      </div>
      {/* These are the vertical range, not the endpoints — labelled explicitly,
          because a bare figure at each end reads as "started here, ended there". */}
      <figcaption className="bankroll-axis">
        <span>
          low <span className="num">{fmtSigned(geom.lo)}</span>
        </span>
        <span>
          {points.length} session{points.length === 1 ? '' : 's'}
        </span>
        <span>
          peak <span className="num">{fmtSigned(geom.hi)}</span>
        </span>
      </figcaption>
    </figure>
  )
}
