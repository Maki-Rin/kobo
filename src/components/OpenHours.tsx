'use client';

import { useSyncExternalStore } from 'react';
import { hoursConfig, nextOpenDay, openState } from '@/lib/hours';

function subscribe(callback: () => void) {
  const timer = window.setInterval(callback, 30_000);
  return () => window.clearInterval(timer);
}

const currentMinute = () => Math.floor(Date.now() / 60_000);

const dayFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
});

export default function OpenHours({ compact = false }: { compact?: boolean }) {
  const minute = useSyncExternalStore(subscribe, currentMinute, () => null);
  if (minute === null) return null;

  const now = new Date(minute * 60_000);
  const { state, today } = openState(now);
  const next = state === 'open' || state === 'before' ? null : nextOpenDay(now);
  const nextText = next ? `次は ${dayFormatter.format(new Date(`${next.date}T00:00:00+09:00`))} ${next.open}〜${next.close}` : null;

  const [badge, tone, text] =
    state === 'open'
      ? ['開室中', 'bg-emerald-50 text-emerald-700', `今日は${today.close}まで`]
      : state === 'before'
        ? ['開室前', 'bg-amber-50 text-amber-800', `今日は ${today.open}〜${today.close}`]
        : state === 'after'
          ? ['今日は終了', 'bg-neutral-100 text-neutral-600', nextText]
          : ['閉室日', 'bg-neutral-100 text-neutral-600', nextText];

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${compact ? 'text-xs' : 'text-sm'}`}>
      <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${tone}`}>{badge}</span>
      {text && <span className={compact ? 'text-xs text-neutral-600' : 'text-sm font-semibold'}>{text}</span>}
      {today.label && <span className='text-xs text-neutral-500'>（{today.label}）</span>}
      {!compact && (
        <span className='text-xs text-neutral-500'>
          平日 {hoursConfig.regular.open}〜{hoursConfig.regular.close}。{hoursConfig.note}
        </span>
      )}
    </div>
  );
}
