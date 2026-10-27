import type { Person } from '../people';
import { audit, type User } from './auth';
import { EditorError, type StagedImage } from './entries';
import { getStore, type FileChange } from './store';

export const PEOPLE_PATH = 'src/content/people.json';
const ID = /^[a-z0-9][a-z0-9-]{1,39}$/;
const IMAGE_NAME = /^[a-z0-9_-]+\.(jpg|png|webp|gif)$/;

export async function loadPeople(): Promise<{ people: Person[]; sha: string | null }> {
  const file = await getStore().read(PEOPLE_PATH);
  if (!file) return { people: [], sha: null };
  return { people: JSON.parse(file.content.toString('utf8')) as Person[], sha: file.sha };
}

function sanitize(raw: unknown): Person[] {
  if (!Array.isArray(raw)) throw new EditorError(['人物の一覧が正しくありません']);
  return raw.map((item) => {
    const value = (item ?? {}) as Record<string, unknown>;
    const text = (key: string) => (typeof value[key] === 'string' ? (value[key] as string).trim() : '');
    return {
      id: text('id'),
      name: text('name'),
      avatar: text('avatar'),
      bio: text('bio'),
      memberId: text('memberId') || null,
    };
  });
}

export async function savePeople(
  user: User,
  input: { people: unknown; baseSha: string | null; images: StagedImage[] }
): Promise<void> {
  const people = sanitize(input.people);
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const person of people) {
    if (!ID.test(person.id)) errors.push(`「${person.name || person.id}」のIDは半角の英小文字・数字・ハイフンにしてください`);
    if (ids.has(person.id)) errors.push(`ID「${person.id}」が重複しています`);
    ids.add(person.id);
    if (!person.name) errors.push('名前が空の人がいます');
    if (person.bio.length > 200) errors.push(`「${person.name}」の紹介は200文字までです`);
  }
  const store = getStore();
  const changes: FileChange[] = [];
  for (const image of input.images) {
    const [, personId, name] = image.name.match(/^([a-z0-9-]+)\/(.+)$/) ?? [];
    if (!personId || !IMAGE_NAME.test(name ?? '') || !(await store.staged(image.sha))) {
      errors.push('アイコン画像を読み込めませんでした。もう一度選んでください');
      continue;
    }
    changes.push({ path: `public/images/people/${personId}/${name}`, blobSha: image.sha });
  }
  if (errors.length > 0) throw new EditorError([...new Set(errors)]);
  changes.push({ path: PEOPLE_PATH, content: Buffer.from(`${JSON.stringify(people, null, 2)}\n`) });
  await store.commit({
    changes,
    expected: { [PEOPLE_PATH]: input.baseSha },
    title: '👤 人物の一覧を更新',
    editor: user,
  });
  await audit(user.id, 'people.save');
}
