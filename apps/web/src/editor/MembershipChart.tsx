import type { LinguisticScale } from '@mateo/project';
import { useTranslation } from 'react-i18next';
import { TfnChart } from '../tfn/TfnChart';
import { isOrdered } from './cellText';
import { useTextRef } from './messages';

/**
 * The membership functions of a scale's terms as triangles over the number line: each one
 * starts at l, peaks at m and ends at u. Static; the interactive version is the Fuzzy
 * Playground.
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
  if (terms.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('scales.chart.empty')}</p>;
  }
  return (
    <TfnChart
      series={terms.map((term) => ({
        id: term.id,
        label: term.abbreviation,
        value: term.value,
      }))}
      domain={[
        Math.min(...terms.map((term) => term.value.l)),
        Math.max(...terms.map((term) => term.value.u)),
      ]}
      numberFormat={numberFormat}
      ariaLabel={t('scales.chart.alt', { name: textOf(scale.name) })}
    />
  );
}
