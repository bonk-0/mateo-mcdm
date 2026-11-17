import type { EChartsCoreOption } from './echarts';

/** Colors read from the design tokens, so charts follow the light and dark themes. */
export interface ChartTheme {
  readonly text: string;
  readonly muted: string;
  readonly border: string;
  readonly surface: string;
  readonly series: readonly string[];
}

export const FALLBACK_THEME: ChartTheme = {
  text: '#0f1c36',
  muted: '#4f5b70',
  border: '#dde3ec',
  surface: '#ffffff',
  series: ['#1f4fd1', '#0e9384', '#c2610c', '#8a3ffc', '#d12771'],
};

/** Reads the theme tokens from the document. Falls back to the light theme where there are none (tests). */
export function readChartTheme(element: Element = document.documentElement): ChartTheme {
  const style = getComputedStyle(element);
  const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    text: token('--foreground', FALLBACK_THEME.text),
    muted: token('--muted-foreground', FALLBACK_THEME.muted),
    border: token('--border', FALLBACK_THEME.border),
    surface: token('--surface', FALLBACK_THEME.surface),
    series: FALLBACK_THEME.series.map((fallback, index) =>
      token(`--series-${index + 1}`, fallback),
    ),
  };
}

type Format = (value: number) => string;

function base(theme: ChartTheme): EChartsCoreOption {
  return {
    animation: false,
    textStyle: { color: theme.text, fontFamily: 'inherit' },
    tooltip: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      textStyle: { color: theme.text },
    },
  };
}

function axisStyle(theme: ChartTheme) {
  return {
    axisLabel: { color: theme.muted },
    axisLine: { lineStyle: { color: theme.border } },
    splitLine: { lineStyle: { color: theme.border } },
  };
}

export interface NamedSeries {
  readonly name: string;
  readonly values: readonly (number | null)[];
}

/** Vertical bars, one series or several side by side. */
export function barOption(params: {
  readonly theme: ChartTheme;
  readonly categories: readonly string[];
  readonly series: readonly NamedSeries[];
  readonly format: Format;
}): EChartsCoreOption {
  const { theme, categories, series, format } = params;
  return {
    ...base(theme),
    color: [...theme.series],
    grid: { left: 56, right: 16, top: series.length > 1 ? 40 : 16, bottom: 40 },
    legend: series.length > 1 ? { top: 0, textStyle: { color: theme.muted } } : undefined,
    tooltip: {
      ...(base(theme)['tooltip'] as object),
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (value: unknown) => (typeof value === 'number' ? format(value) : '–'),
    },
    xAxis: { type: 'category', data: [...categories], ...axisStyle(theme) },
    yAxis: {
      type: 'value',
      ...axisStyle(theme),
      axisLabel: { color: theme.muted, formatter: (value: number) => format(value) },
    },
    series: series.map((item) => ({
      type: 'bar',
      name: item.name,
      data: [...item.values],
      barMaxWidth: 48,
    })),
  };
}

/** Above this many cells the heatmap shows colours only. */
export const HEATMAP_LABEL_LIMIT = 600;

/** Rows (alternatives) by columns (criteria), darker is a larger contribution. */
export function heatmapOption(params: {
  readonly theme: ChartTheme;
  readonly rows: readonly string[];
  readonly columns: readonly string[];
  readonly values: readonly (readonly (number | null)[])[];
  readonly format: Format;
}): EChartsCoreOption {
  const { theme, rows, columns, values, format } = params;
  const cells: [number, number, number][] = [];
  let min = Infinity;
  let max = -Infinity;
  values.forEach((row, r) =>
    row.forEach((value, c) => {
      if (value === null) return;
      cells.push([c, r, value]);
      min = Math.min(min, value);
      max = Math.max(max, value);
    }),
  );
  if (cells.length === 0) {
    min = 0;
    max = 1;
  }
  return {
    ...base(theme),
    grid: { left: 96, right: 16, top: 16, bottom: 72 },
    tooltip: {
      ...(base(theme)['tooltip'] as object),
      position: 'top',
      formatter: (item: { value: [number, number, number] }) =>
        `${rows[item.value[1]] ?? ''} · ${columns[item.value[0]] ?? ''}: ${format(item.value[2])}`,
    },
    xAxis: { type: 'category', data: [...columns], splitArea: { show: true }, ...axisStyle(theme) },
    yAxis: {
      type: 'category',
      data: [...rows],
      inverse: true,
      splitArea: { show: true },
      ...axisStyle(theme),
    },
    visualMap: {
      min,
      max,
      calculable: false,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      textStyle: { color: theme.muted },
      formatter: (value: number) => format(value),
      inRange: { color: [theme.surface, theme.series[0] ?? FALLBACK_THEME.series[0]!] },
    },
    series: [
      {
        type: 'heatmap',
        data: cells,
        label: {
          // Thousands of numbers cannot be read in the chart and cost seconds to draw; the
          // tooltip still gives every value.
          show: cells.length <= HEATMAP_LABEL_LIMIT,
          color: theme.text,
          formatter: (item: { value: [number, number, number] }) => format(item.value[2]),
        },
        itemStyle: { borderColor: theme.border, borderWidth: 1 },
      },
    ],
  };
}

/**
 * Rank against weight, one line per alternative. Rank 1 is at the top, so a line that
 * rises is an alternative that improves. A `null` is a point where the engine could not run.
 */
export function rankLineOption(params: {
  readonly theme: ChartTheme;
  readonly weights: readonly number[];
  readonly series: readonly NamedSeries[];
  readonly format: Format;
  readonly axisName: string;
  readonly rankName: string;
}): EChartsCoreOption {
  const { theme, weights, series, format, axisName, rankName } = params;
  return {
    ...base(theme),
    color: [...theme.series],
    grid: { left: 56, right: 16, top: 40, bottom: 48 },
    legend: { top: 0, textStyle: { color: theme.muted } },
    tooltip: {
      ...(base(theme)['tooltip'] as object),
      trigger: 'axis',
      valueFormatter: (value: unknown) => (typeof value === 'number' ? String(value) : '–'),
    },
    xAxis: {
      type: 'category',
      name: axisName,
      nameLocation: 'middle',
      nameGap: 28,
      nameTextStyle: { color: theme.muted },
      data: weights.map((weight) => format(weight)),
      ...axisStyle(theme),
    },
    yAxis: {
      type: 'value',
      name: rankName,
      nameTextStyle: { color: theme.muted },
      inverse: true,
      min: 1,
      max: Math.max(2, series.length),
      interval: 1,
      ...axisStyle(theme),
    },
    series: series.map((item) => ({
      type: 'line',
      name: item.name,
      data: [...item.values],
      symbolSize: 7,
      connectNulls: false,
    })),
  };
}
