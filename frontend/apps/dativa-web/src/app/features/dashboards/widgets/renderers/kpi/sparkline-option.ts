import type { EChartsCoreOption } from 'echarts/core';
import { MetricId } from '../../widget.models';
import { KpiWidgetData } from '../../query/widget-query.models';
import { formatMetric } from '../../query/format-metric';
import { ChartTheme } from '../chart/chart-theme';

export function buildSparklineOption(
  data: KpiWidgetData['sparkline'],
  metric: MetricId,
  theme: ChartTheme,
): EChartsCoreOption {
  return {
    color: [theme.primary],
    animationDuration: 220,
    grid: { top: 6, right: 4, bottom: 4, left: 4 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: theme.surface,
      borderColor: theme.border,
      textStyle: { color: theme.text, fontFamily: theme.font },
      valueFormatter: (value: unknown) => formatMetric(Number(value), metric),
    },
    xAxis: {
      type: 'category',
      data: data.categories.map((item) => item.label),
      show: false,
    },
    yAxis: { type: 'value', show: false },
    series: [
      {
        type: 'line',
        data: data.values,
        smooth: true,
        showSymbol: false,
        symbolSize: 6,
        lineStyle: { width: 2, color: theme.primary },
        areaStyle: { color: theme.primary, opacity: 0.16 },
        emphasis: { focus: 'series' },
      },
    ],
  };
}
