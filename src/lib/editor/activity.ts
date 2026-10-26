import { getDb } from './db';

export type ArticleAction = 'draft' | 'publish' | 'update' | 'unpublish' | 'revert';

export const articleActionLabels: Record<ArticleAction, string> = {
  draft: '下書きを保存',
  publish: '公開',
  update: '更新',
  unpublish: '下書きに戻した',
  revert: '元に戻した',
};

export interface ArticleEvent {
  articleId: string;
  title: string;
  action: ArticleAction;
  userId: string | null;
  userName: string | null;
  commitId: string;
  at: string;
}

interface EventRow {
  article_id: string;
  title: string;
  action: ArticleAction;
  user_id: string | null;
  user_name: string | null;
  commit_id: string;
  at: string;
}

const toEvent = (row: EventRow): ArticleEvent => ({
  articleId: row.article_id,
  title: row.title,
  action: row.action,
  userId: row.user_id,
  userName: row.user_name,
  commitId: row.commit_id,
  at: row.at,
});

const SELECT = `SELECT e.article_id, e.title, e.action, e.user_id, u.display_name AS user_name, e.commit_id, e.at
  FROM article_events e LEFT JOIN users u ON u.id = e.user_id`;

export async function recordArticleEvent(event: Omit<ArticleEvent, 'userName' | 'at'>) {
  const db = await getDb();
  await db.run(
    'INSERT INTO article_events (article_id, title, action, user_id, commit_id, at) VALUES (?, ?, ?, ?, ?, ?)',
    [event.articleId, event.title, event.action, event.userId, event.commitId, new Date().toISOString()]
  );
}

export async function latestEventByArticle(): Promise<Map<string, ArticleEvent>> {
  const db = await getDb();
  const rows = await db.all<EventRow>(
    `${SELECT} WHERE e.id IN (SELECT MAX(id) FROM article_events GROUP BY article_id)`
  );
  return new Map(rows.map((row) => [row.article_id, toEvent(row)]));
}

export async function recentEvents(options: { userId?: string; articleId?: string; limit: number }) {
  const db = await getDb();
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (options.userId) {
    where.push('e.user_id = ?');
    params.push(options.userId);
  }
  if (options.articleId) {
    where.push('e.article_id = ?');
    params.push(options.articleId);
  }
  const rows = await db.all<EventRow>(
    `${SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY e.id DESC LIMIT ?`,
    [...params, options.limit]
  );
  return rows.map(toEvent);
}

export async function lastLogins(): Promise<Map<string, string>> {
  const db = await getDb();
  const rows = await db.all<{ actor_id: string; at: string }>(
    "SELECT actor_id, MAX(at) AS at FROM audit_log WHERE action = 'login' GROUP BY actor_id"
  );
  return new Map(rows.map((row) => [row.actor_id, row.at]));
}
