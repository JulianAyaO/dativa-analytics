import type { EChartsCoreOption } from 'echarts/core';
import { TitleComponent } from 'echarts/components';
import { echarts } from '../../../../core/charts/echarts.config';
import { MetricId } from '../widget.models';
import { formatChange, formatMetric } from './format-metric';
import { WidgetData } from './widget-query.models';
import { ChartTheme, readChartTheme } from '../renderers/chart/chart-theme';
import { buildCompositionOption } from '../renderers/composition/composition-option';
import { buildRankingOption } from '../renderers/ranking/ranking-option';
import { buildSeriesOption } from '../renderers/series/series-option';
import { buildSparklineOption } from '../renderers/kpi/sparkline-option';
import { ExcelImage } from '../../../explorer/data/xlsx-workbook';

let titleRegistered = false;

export async function snapshotWidget(
  data: WidgetData,
  metric: MetricId,
  title: string,
): Promise<ExcelImage | undefined> {
  if (!canSnapshot()) {
    return undefined;
  }

  ensureTitle();
  const theme = readChartTheme();
  const size = data.family === 'kpi' || data.family === 'progress' ? { width: 920, height: 280 } : { width: 920, height: 420 };
  const option = optionFor(data, metric, title, theme);
  const png = await renderPng(option, size.width, size.height);
  return png ? { png, widthPx: size.width, heightPx: size.height } : undefined;
}

function canSnapshot(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext?.('2d'));
  } catch {
    return false;
  }
}

function ensureTitle(): void {
  if (titleRegistered) {
    return;
  }
  echarts.use([TitleComponent]);
  titleRegistered = true;
}

function optionFor(data: WidgetData, metric: MetricId, title: string, theme: ChartTheme): EChartsCoreOption {
  if (data.family === 'series') {
    return withTitle(buildSeriesOption(data, metric, theme), title, theme);
  }
  if (data.family === 'composition') {
    return withTitle(buildCompositionOption(data, metric, theme), title, theme);
  }
  if (data.family === 'ranking') {
    return withTitle(buildRankingOption(data, metric, theme), title, theme);
  }
  if (data.family === 'table') {
    return withTitle(
      buildRankingOption(
        {
          family: 'ranking',
          items: data.rows.map((row, index) => ({
            rank: index + 1,
            key: row.key,
            label: row.label,
            value: row.value,
            share: row.share,
          })),
        },
        metric,
        theme,
      ),
      title,
      theme,
    );
  }
  if (data.family === 'kpi') {
    return {
      ...buildSparklineOption(data.sparkline, metric, theme),
      animation: false,
      title: {
        text: formatMetric(data.value, metric),
        subtext: `${title} · ${formatChange(data.changePct)} vs periodo anterior`,
        left: 'center',
        top: 8,
        textStyle: { color: theme.text, fontSize: 32, fontFamily: theme.font, fontWeight: 700 },
        subtextStyle: { color: theme.muted, fontSize: 13, fontFamily: theme.font },
      },
      grid: { top: 88, right: 16, bottom: 16, left: 16 },
    };
  }

  const percent = Math.max(0, Math.min(100, Math.round(data.ratio * 100)));
  return {
    animation: false,
    color: [theme.primary],
    title: {
      text: `${percent}%`,
      subtext: `${title} · ${formatMetric(data.value, metric)} de ${formatMetric(data.target, metric)}`,
      left: 'center',
      top: 12,
      textStyle: { color: theme.primary, fontSize: 32, fontFamily: theme.font, fontWeight: 700 },
      subtextStyle: { color: theme.muted, fontSize: 13, fontFamily: theme.font },
    },
    grid: { top: 92, left: 28, right: 28, bottom: 36 },
    xAxis: {
      type: 'value',
      max: 100,
      splitLine: { show: false },
      axisLabel: { color: theme.muted, formatter: '{value}%' },
    },
    yAxis: {
      type: 'category',
      data: [''],
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: [percent],
        barWidth: 22,
        itemStyle: { color: theme.primary, borderRadius: 6 },
      },
    ],
  };
}

function withTitle(option: EChartsCoreOption, title: string, theme: ChartTheme): EChartsCoreOption {
  const grid = option['grid'];
  return {
    ...option,
    animation: false,
    title: {
      text: title,
      left: 0,
      top: 0,
      textStyle: { color: theme.text, fontSize: 14, fontFamily: theme.font, fontWeight: 600 },
    },
    grid: {
      ...(typeof grid === 'object' && grid && !Array.isArray(grid) ? grid : {}),
      top: 36,
    },
  };
}

function renderPng(option: EChartsCoreOption, width: number, height: number): Promise<Uint8Array | undefined> {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    host.style.cssText = `position:fixed;left:-9999px;top:0;width:${width}px;height:${height}px;background:#fff`;
    document.body.appendChild(host);
    const chart = echarts.init(host, undefined, { renderer: 'canvas', width, height });
    chart.setOption(option);

    const finish = () => {
      try {
        const url = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' });
        resolve(dataUrlToPng(url));
      } catch {
        resolve(undefined);
      } finally {
        chart.dispose();
        host.remove();
      }
    };

    globalThis.setTimeout(finish, 40);
  });
}

function dataUrlToPng(url: string): Uint8Array | undefined {
  const marker = 'base64,';
  const index = url.indexOf(marker);
  if (index < 0) {
    return undefined;
  }
  const binary = globalThis.atob(url.slice(index + marker.length));
  const bytes = new Uint8Array(binary.length);
  for (let offset = 0; offset < binary.length; offset += 1) {
    bytes[offset] = binary.charCodeAt(offset);
  }
  return bytes[0] === 0x89 ? bytes : undefined;
}
