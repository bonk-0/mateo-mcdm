import type { TraceValue } from '@mateo/engine';
import { Fragment } from 'react';
import { useFormatters } from '../hooks/preferences';

/**
 * A value of the trace at the user's display precision. Every number carries its exact
 * value in `data-value`: the proof that what is shown is a number of the engine.
 */
export function Value({ value }: { value: TraceValue }) {
  const formatters = useFormatters();
  if (value === null) return <span>–</span>;
  if (typeof value === 'string') return <span>{value}</span>;
  if (typeof value === 'number') {
    return (
      <span translate="no" data-value={String(value)}>
        {formatters.value(value)}
      </span>
    );
  }
  const components = Object.entries(value.components);
  return (
    <span translate="no" className="whitespace-nowrap">
      (
      {components.map(([name, component], index) => (
        <Fragment key={name}>
          {index > 0 && ', '}
          <span data-value={String(component)}>{formatters.value(component)}</span>
        </Fragment>
      ))}
      )
    </span>
  );
}
