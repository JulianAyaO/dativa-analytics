import type { EChartsCoreOption } from 'echarts/core';
import { MetricId } from '../../widget.models';
import { CompositionWidgetData } from '../../query/widget-query.models';
import { formatMetric, formatShare } from '../../query/format-metric';
import { ChartTheme, cartesianBase } from '../chart/chart-theme';

export function buildCompositionOption(
  data: CompositionWidgetData,
  metric: MetricId,
  theme: ChartTheme,
): EChartsCoreOption {
  return {
    ...cartesianBase(theme),
    tooltip: {
      trigger: 'item',
      backgroundColor: theme.surface,
      borderColor: theme.border,
      textStyle: { color: theme.text, fontFamily: theme.font },
      formatter: (raw: unknown) => {
        const params = (Array.isArray(raw) ? raw[0] : raw) as {
          name: string;
          value: number;
          percent: number;
        };
        return `${params.name}<br/>${formatMetric(params.value, metric)} · ${formatShare(params.percent / 100)}`;
      },
    },
    legend: {
      bottom: 0,
      type: 'scroll',
      textStyle: { color: theme.muted, fontFamily: theme.font },
    },
    series: [
      {
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '46%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: theme.surface, borderWidth: 2 },
        label: { color: theme.text, formatter: '{d}%' },
        emphasis: {
          scale: true,
          scaleSize: 8,
          itemStyle: { shadowBlur: 12, shadowColor: 'rgba(15, 23, 42, 0.2)' },
        },
        data: data.slices.map((slice) => ({
          name: slice.label,
          value: slice.value,
        })),
      },
    ],
  };
}
