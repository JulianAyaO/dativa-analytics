import type { EChartsCoreOption } from 'echarts/core';
import { MetricId } from '../../widget.models';
import { RankingWidgetData } from '../../query/widget-query.models';
import { formatMetric } from '../../query/format-metric';
import { ChartTheme, cartesianBase } from '../chart/chart-theme';

export function buildRankingOption(
  data: RankingWidgetData,
  metric: MetricId,
  theme: ChartTheme,
): EChartsCoreOption {
  const labels = [...data.items].reverse().map((item) => item.label);
  const values = [...data.items].reverse().map((item) => item.value);

  return {
    ...cartesianBase(theme),
    legend: { show: false },
    grid: { top: 8, right: 16, bottom: 8, left: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: theme.surface,
      borderColor: theme.border,
      textStyle: { color: theme.text, fontFamily: theme.font },
      valueFormatter: (value: unknown) => formatMetric(Number(value), metric),
    },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: theme.border, opacity: 0.7 } },
      axisLabel: {
        color: theme.muted,
        formatter: (value: number) => formatMetric(value, metric),
      },
    },
    yAxis: {
      type: 'category',
      data: labels,
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: theme.text },
    },
    series: [
      {
        type: 'bar',
        data: values,
        barMaxWidth: 18,
        itemStyle: { color: theme.primary, borderRadius: [0, 4, 4, 0] },
        cursor: 'pointer',
        emphasis: { focus: 'self' },
      },
    ],
  };
}
