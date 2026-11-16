import { describe, expect, it } from 'vitest';
import { barOption, FALLBACK_THEME, heatmapOption } from './options';

const format = (value: number) => value.toFixed(2);

describe('chart options', () => {
  it('draws one bar per category with the values as given', () => {
    const option = barOption({
      theme: FALLBACK_THEME,
      categories: ['A1', 'A2'],
      series: [{ name: 'f(K)', values: [0.5, null] }],
      format,
    }) as { xAxis: { data: string[] }; series: { data: (number | null)[]; name: string }[] };
    expect(option.xAxis.data).toEqual(['A1', 'A2']);
    expect(option.series[0]!.data).toEqual([0.5, null]);
  });

  it('keeps one series per name when several are compared', () => {
    const option = barOption({
      theme: FALLBACK_THEME,
      categories: ['A1'],
      series: [
        { name: 'f(K⁻)', values: [0.1] },
        { name: 'f(K⁺)', values: [0.2] },
      ],
      format,
    }) as { series: { name: string }[] };
    expect(option.series.map((item) => item.name)).toEqual(['f(K⁻)', 'f(K⁺)']);
  });

  it('turns a matrix into [column, row, value] cells and skips empty ones', () => {
    const option = heatmapOption({
      theme: FALLBACK_THEME,
      rows: ['A1', 'A2'],
      columns: ['C1', 'C2'],
      values: [
        [0.1, null],
        [0.3, 0.4],
      ],
      format,
    }) as { series: { data: number[][] }[]; visualMap: { min: number; max: number } };
    expect(option.series[0]!.data).toEqual([
      [0, 0, 0.1],
      [0, 1, 0.3],
      [1, 1, 0.4],
    ]);
    expect(option.visualMap).toMatchObject({ min: 0.1, max: 0.4 });
  });
});
