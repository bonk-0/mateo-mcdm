import { useEffect, useRef } from 'react';
import { useResolvedTheme } from '../../hooks/preferences';
import { echarts, type EChartsCoreOption } from './echarts';
import { readChartTheme, type ChartTheme } from './options';

/**
 * Draws an ECharts option. `buildOption` gets the theme colors; the chart is redrawn when
 * the option or the theme changes and resized with its container. `label` is the accessible
 * name of the figure.
 */
export function EChart({
  label,
  buildOption,
  height = 280,
}: {
  label: string;
  buildOption: (theme: ChartTheme) => EChartsCoreOption;
  height?: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const theme = useResolvedTheme();

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const chart = echarts.init(element, undefined, { renderer: 'svg' });
    chart.setOption(buildOption(readChartTheme(element)));
    const observer =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => chart.resize());
    observer?.observe(element);
    return () => {
      observer?.disconnect();
      chart.dispose();
    };
    // `theme` is a dependency so that the colors are read again after a theme change.
  }, [buildOption, theme]);

  return (
    <div ref={container} role="img" aria-label={label} style={{ height }} className="w-full" />
  );
}
