export interface ChartTheme {
  text: string;
  muted: string;
  border: string;
  surface: string;
  primary: string;
  success: string;
  danger: string;
  font: string;
  palette: string[];
}

const LIGHT: ChartTheme = {
  text: '#15202b',
  muted: '#5b6775',
  border: '#d5dce3',
  surface: '#ffffff',
  primary: '#0f766e',
  success: '#067647',
  danger: '#b42318',
  font: 'IBM Plex Sans, ui-sans-serif, system-ui, sans-serif',
  palette: ['#0f766e', '#026aa2', '#b54708', '#6941c6', '#dd2590'],
};

export function readChartTheme(): ChartTheme {
  if (typeof getComputedStyle === 'undefined') {
    return LIGHT;
  }

  const css = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;

  return {
    text: token('--dtv-color-text', LIGHT.text),
    muted: token('--dtv-color-text-muted', LIGHT.muted),
    border: token('--dtv-color-border', LIGHT.border),
    surface: token('--dtv-color-surface', LIGHT.surface),
    primary: token('--dtv-color-primary', LIGHT.primary),
    success: token('--dtv-color-success', LIGHT.success),
    danger: token('--dtv-color-danger', LIGHT.danger),
    font: token('--dtv-font', LIGHT.font),
    palette: [
      token('--dtv-chart-1', LIGHT.palette[0] ?? LIGHT.primary),
      token('--dtv-chart-2', LIGHT.palette[1] ?? LIGHT.primary),
      token('--dtv-chart-3', LIGHT.palette[2] ?? LIGHT.primary),
      token('--dtv-chart-4', LIGHT.palette[3] ?? LIGHT.primary),
      token('--dtv-chart-5', LIGHT.palette[4] ?? LIGHT.primary),
    ],
  };
}

export function cartesianBase(theme: ChartTheme) {
  return {
    color: theme.palette,
    textStyle: {
      color: theme.text,
      fontFamily: theme.font,
    },
    grid: {
      top: 28,
      right: 12,
      bottom: 28,
      left: 8,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: theme.surface,
      borderColor: theme.border,
      textStyle: { color: theme.text, fontFamily: theme.font },
    },
    legend: {
      top: 0,
      textStyle: { color: theme.muted, fontFamily: theme.font },
    },
    animationDuration: 280,
    animationDurationUpdate: 0,
  };
}
