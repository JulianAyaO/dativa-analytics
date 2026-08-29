import { MetricId } from '../widget.models';

const currency = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const currencyExact = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const integer = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

const percent = new Intl.NumberFormat('es-CO', {
  style: 'percent',
  signDisplay: 'exceptZero',
  maximumFractionDigits: 1,
});

const percentUnsigned = new Intl.NumberFormat('es-CO', {
  style: 'percent',
  maximumFractionDigits: 0,
});

export function formatMetric(value: number, metric: MetricId): string {
  if (metric === 'avg_ticket') {
    return currencyExact.format(value);
  }

  if (metric === 'revenue') {
    return currency.format(value);
  }

  return integer.format(value);
}

export function formatChange(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return 's/d';
  }

  return percent.format(value);
}

export function formatShare(value: number): string {
  return percentUnsigned.format(value);
}

export function axisFormatter(metric: MetricId): (value: number | string) => string {
  return (value) => formatMetric(Number(value), metric);
}
