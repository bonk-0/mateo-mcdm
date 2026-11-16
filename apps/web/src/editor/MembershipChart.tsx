import type { LinguisticScale } from '@mateo/project';
import { useTranslation } from 'react-i18next';
import { isOrdered } from './cellText';
import { useTextRef } from './messages';

const WIDTH = 560;
const HEIGHT = 220;
const PAD = { left: 36, right: 16, top: 16, bottom: 32 };
const SERIES = ['--series-1', '--series-2', '--series-3', '--series-4', '--series-5'];

/** A "nice" step for about five ticks across `span`. */
function tickStep(span: number): number {
  const rough = span / 5;
  const power = 10 ** Math.floor(Math.log10(rough));
  const unit = rough / power;
  return (unit < 1.5 ? 1 : unit < 3.5 ? 2 : unit < 7.5 ? 5 : 10) * power;
}

/**
 * The membership functions of a scale's terms as triangles over the number line: each one
 * starts at l, peaks at m and ends at u. Static; the interactive playground is P1.14.
 */
export function MembershipChart({
  scale,
  numberFormat,
}: {
  scale: LinguisticScale;
  numberFormat: (value: number) => string;
}) {
  const { t } = useTranslation('matrix');
  const textOf = useTextRef();
  const terms = scale.terms.filter((term) => isOrdered(term.value));
  const name = textOf(scale.name);
  if (terms.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('scales.chart.empty')}</p>;
  }
  const min = Math.min(...terms.map((term) => term.value.l));
  const max = Math.max(...terms.map((term) => term.value.u));
  const span = max - min || 1;
  const x = (value: number) => PAD.left + ((value - min) / span) * (WIDTH - PAD.left - PAD.right);
  const y = (degree: number) => PAD.top + (1 - degree) * (HEIGHT - PAD.top - PAD.bottom);
  const step = tickStep(span);
  const ticks: number[] = [];
  for (let tick = Math.ceil(min / step) * step; tick <= max + step / 1e6; tick += step) {
    ticks.push(Math.round(tick * 1e9) / 1e9);
  }

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={t('scales.chart.alt', { name })}
      className="h-auto w-full max-w-2xl"
    >
      {[0, 0.5, 1].map((degree) => (
        <g key={degree}>
          <line
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={y(degree)}
            y2={y(degree)}
            stroke="var(--border)"
            strokeDasharray={degree === 0 ? undefined : '3 4'}
          />
          <text
            x={PAD.left - 6}
            y={y(degree) + 4}
            textAnchor="end"
            fontSize="11"
            fill="var(--muted-foreground)"
          >
            {numberFormat(degree)}
          </text>
        </g>
      ))}
      {ticks.map((tick) => (
        <text
          key={tick}
          x={x(tick)}
          y={HEIGHT - PAD.bottom + 16}
          textAnchor="middle"
          fontSize="11"
          fill="var(--muted-foreground)"
        >
          {numberFormat(tick)}
        </text>
      ))}
      {terms.map((term, index) => {
        const { l, m, u } = term.value;
        const color = `var(${SERIES[index % SERIES.length] as string})`;
        return (
          <g key={term.id}>
            <polygon
              points={`${x(l)},${y(0)} ${x(m)},${y(1)} ${x(u)},${y(0)}`}
              fill={color}
              fillOpacity={0.14}
              stroke={color}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            <text
              x={x(m)}
              y={y(1) - 4}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="var(--foreground)"
            >
              {term.abbreviation}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
