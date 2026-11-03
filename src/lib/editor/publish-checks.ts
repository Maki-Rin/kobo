import { hasAnnouncement, isPastEvent, todayInTokyo, type Entry } from '../content-schema';

export interface PublishCheck {
  level: 'block' | 'warn';
  message: string;
}

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));

export function publishChecks(entry: Entry, today = todayInTokyo()): PublishCheck[] {
  const checks: PublishCheck[] = [];
  const block = (message: string) => checks.push({ level: 'block', message });
  const warn = (message: string) => checks.push({ level: 'warn', message });

  if (!entry.title.trim()) block('タイトルを入れてください');

  if (entry.collection === 'articles') {
    if (!entry.body.trim()) block('本文が空です');
    if (!entry.coverImage) block('カバー画像を入れてください');
    if (entry.authors.length === 0) block('書いた人を入れてください');
    if (!entry.excerpt.trim()) warn('概要が空です。一覧には本文の最初が出ます');
    if (entry.machines.length === 0) warn('使った機材が選ばれていません。機材での絞り込みに出ません');
  }

  if (entry.collection === 'works') {
    if (!entry.coverImage) block('カバー画像を入れてください');
    if (entry.authors.length === 0) block('作った人を入れてください');
    if (!entry.body.trim()) warn('説明が空です');
    if (entry.machines.length === 0) warn('使った機材が選ばれていません。機材での絞り込みに出ません');
  }

  if (entry.collection === 'events') {
    if (!validDate(entry.date)) block('開催日を入れてください');
    const upcoming = validDate(entry.date) && entry.date >= today;
    if (entry.reportOnly) {
      if (!entry.record.trim()) block('「開催報告だけ」にしていますが、開催報告が空です');
      if (validDate(entry.date) && entry.date > today) warn('開催日がまだ先ですが、「開催報告だけ」で公開します');
    } else {
      if (!entry.body.trim() && !entry.coverImage && !entry.record.trim()) {
        block('告知の本文か告知画像を入れてください。告知を出さない場合は「設定」の載せ方を「開催報告だけ」にしてください');
      }
      if (!upcoming && validDate(entry.date) && !entry.record.trim()) {
        warn('開催日を過ぎています。告知として「これまでのイベント」に載ります。終わった報告なら「開催報告だけ」にしてください');
      }
      if (upcoming && !entry.place.trim()) warn('場所が空です');
      if (upcoming && !entry.startTime) warn('開始時刻が空です');
    }
    if (!entry.coverImage) warn(entry.reportOnly ? '代表の写真がありません' : '告知画像がありません。一覧のカードが「画像なし」になります');
  }

  return checks;
}

export function publishBlockers(entry: Entry, today?: string): string[] {
  return publishChecks(entry, today).filter((check) => check.level === 'block').map((check) => check.message);
}

export function publishPlaces(entry: Entry, today = todayInTokyo()): string[] {
  switch (entry.collection) {
    case 'articles':
      return ['記事一覧', 'トップの「新着」'];
    case 'works':
      return ['作例一覧', 'トップの「作例」'];
    case 'events':
      if (!isPastEvent(entry, today)) return ['イベントの「開催予定」', 'トップの「開催予定」'];
      if (entry.record.trim()) {
        return hasAnnouncement(entry)
          ? ['イベントの「開催報告」', 'トップの「新着」', '（告知は開催報告の下にたたんで出ます）']
          : ['イベントの「開催報告」', 'トップの「新着」'];
      }
      return ['イベントの「これまでのイベント」'];
  }
}
