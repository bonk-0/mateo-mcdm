/**
 * Apache ECharts with only the parts Mateo draws, so the bundle stays small. The SVG
 * renderer keeps text sharp at any zoom.
 */
import { BarChart, HeatmapChart, LineChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components';
import * as core from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';

core.use([
  BarChart,
  HeatmapChart,
  LineChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  VisualMapComponent,
  SVGRenderer,
]);

export { core as echarts };
export type { EChartsCoreOption } from 'echarts/core';
