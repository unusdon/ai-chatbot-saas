import type { DailyBucket } from '@/lib/server/analytics';

/**
 * Bar chart — pure SVG, no client JS. Picking SVG over a chart library here
 * keeps the bundle lean and the SSR path simple. For richer interactivity
 * (hover tooltips, zoom) we'd promote to Recharts when it becomes the
 * primary friction.
 */
export function DailyMessageChart({ data }: { data: DailyBucket[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }

  const width = 720;
  const height = 180;
  const padding = { top: 16, right: 12, bottom: 28, left: 32 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const max = Math.max(1, ...data.map((d) => d.count));
  const barWidth = innerW / data.length;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label="Daily user messages"
    >
      <g transform={`translate(${padding.left} ${padding.top})`}>
        {[0, 0.5, 1].map((t) => {
          const y = innerH - t * innerH;
          return (
            <g key={t}>
              <line x1={0} x2={innerW} y1={y} y2={y} stroke="currentColor" strokeOpacity={0.1} />
              <text x={-6} y={y + 4} textAnchor="end" fontSize="10" fill="currentColor" opacity={0.6}>
                {Math.round(t * max)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const h = (d.count / max) * innerH;
          return (
            <g key={d.day}>
              <rect
                x={i * barWidth + 4}
                y={innerH - h}
                width={Math.max(0, barWidth - 8)}
                height={h}
                rx={2}
                fill="currentColor"
                opacity={0.85}
              />
              {i % Math.max(1, Math.floor(data.length / 7)) === 0 ? (
                <text
                  x={i * barWidth + barWidth / 2}
                  y={innerH + 18}
                  textAnchor="middle"
                  fontSize="10"
                  fill="currentColor"
                  opacity={0.6}
                >
                  {formatDay(d.day)}
                </text>
              ) : null}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function formatDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
