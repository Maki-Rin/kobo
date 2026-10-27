import type { Entry } from './content-schema';

const dateFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
});

export function formatEventDate(entry: Pick<Entry, 'date' | 'startTime' | 'endTime'>): string {
  if (!entry.date) return '日程未定';
  const day = dateFormatter.format(new Date(`${entry.date}T00:00:00+09:00`));
  if (!entry.startTime) return day;
  return `${day} ${entry.startTime}${entry.endTime ? `〜${entry.endTime}` : ''}`;
}
