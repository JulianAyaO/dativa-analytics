import type { EChartsCoreOption } from 'echarts/core';
import { MetricId } from '../../widget.models';
import { SeriesWidgetData } from '../../query/widget-query.models';
import { formatMetric } from '../../query/format-metric';
import { ChartTheme, cartesianBase } from '../chart/chart-theme';

export function buildSeriesOption(
  data: SeriesWidgetData,
  metric: MetricId,
  theme: ChartTheme,
): EChartsCoreOption {
  const categories = data.categories.map((item) => item.label);
  const compact = categories.length > 10;

  return {
    ...cartesianBase(theme),
    tooltip: {
      ...cartesianBase(theme).tooltip,
      valueFormatter: (value: unknown) => formatMetric(Number(value), metric),
    },
    dataZoom: compact
      ? [
          { type: 'inside', throttle: 50 },
          { type: 'slider', height: 12, bottom: 4, borderColor: theme.border },
        ]
      : undefined,
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        color: theme.muted,
        hideOverlap: true,
        rotate: compact ? 35 : 0,
      },
      axisLine: { lineStyle: { color: theme.border } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: theme.border, opacity: 0.7 } },
      axisLabel: {
        color: theme.muted,
        formatter: (value: number) => formatMetric(value, metric),
      },
    },
    series: data.series.map((item, index) =>
      seriesItem(data.variant, item, theme.palette[index] ?? theme.primary, index === 0),
    ),
  };
}

function seriesItem(
  variant: SeriesWidgetData['variant'],
  item: SeriesWidgetData['series'][number],
  color: string,
  primary: boolean,
) {
  if (variant === 'bar') {
    return {
      id: item.id,
      name: item.label,
      type: 'bar' as const,
      data: item.values,
      barMaxWidth: 28,
      itemStyle: {
        color,
        opacity: primary ? 1 : 0.55,
        borderRadius: [4, 4, 0, 0],
      },
      emphasis: { focus: 'series' as const },
    };
  }

  return {
    id: item.id,
    name: item.label,
    type: 'line' as const,
    data: item.values,
    smooth: true,
    showSymbol: true,
    symbolSize: 7,
    lineStyle: {
      width: primary ? 2.5 : 1.75,
      type: primary ? ('solid' as const) : ('dashed' as const),
      color,
    },
    itemStyle: { color },
    areaStyle:
      variant === 'area'
        ? { color, opacity: primary ? 0.18 : 0.06 }
        : undefined,
    emphasis: { focus: 'series' as const },
  };
}
