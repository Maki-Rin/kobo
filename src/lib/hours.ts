import hoursData from '@/content/hours.json';

export interface DayHours {
  date: string;
  open: string | null;
  close: string | null;
  label: string | null;
}

export interface HoursConfig {
  regular: { days: number[]; open: string; close: string };
  periods: { from: string; to: string; label: string; closed?: boolean; open?: string; close?: string }[];
  exceptions: { date: string; label: string; closed?: boolean; open?: string; close?: string }[];
  note: string;
}

export const hoursConfig = hoursData as HoursConfig;

const tokyoDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' });
const tokyoTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false });
const weekdayFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', weekday: 'short' });
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function tokyoDateString(date: Date): string {
  return tokyoDate.format(date);
}

export function tokyoTimeString(date: Date): string {
  return tokyoTime.format(date);
}

export function hoursOn(day: Date, config = hoursConfig): DayHours {
  const date = tokyoDateString(day);
  const exception = config.exceptions.find((item) => item.date === date);
  if (exception) {
    return exception.closed
      ? { date, open: null, close: null, label: exception.label }
      : {
          date,
          open: exception.open ?? config.regular.open,
          close: exception.close ?? config.regular.close,
          label: exception.label,
        };
  }
  const period = config.periods.find((item) => item.from <= date && date <= item.to);
  if (period?.closed) return { date, open: null, close: null, label: period.label };
  const weekday = weekdays.indexOf(weekdayFormatter.format(day));
  if (!config.regular.days.includes(weekday)) return { date, open: null, close: null, label: null };
  return {
    date,
    open: period?.open ?? config.regular.open,
    close: period?.close ?? config.regular.close,
    label: period?.label ?? null,
  };
}

export type OpenState = 'open' | 'before' | 'after' | 'closed';

export function openState(now: Date, config = hoursConfig): { state: OpenState; today: DayHours } {
  const today = hoursOn(now, config);
  if (!today.open || !today.close) return { state: 'closed', today };
  const time = tokyoTimeString(now);
  if (time < today.open) return { state: 'before', today };
  if (time >= today.close) return { state: 'after', today };
  return { state: 'open', today };
}

export function nextOpenDay(now: Date, config = hoursConfig): DayHours | null {
  for (let offset = 1; offset <= 60; offset++) {
    const day = hoursOn(new Date(now.getTime() + offset * 86_400_000), config);
    if (day.open) return day;
  }
  return null;
}
