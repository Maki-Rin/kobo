'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Person } from '@/lib/people';
import { savePeopleAction, uploadImageAction } from '../actions';
import ErrorList from './ErrorList';
import ImageDropZone from './editor/ImageDropZone';
import { ImageError, prepareImage } from './editor/prepareImage';
import { button, card, input, select, textarea } from './ui';

interface PendingAvatar {
  name: string;
  sha: string;
  url: string;
}

const randomSuffix = () => Math.random().toString(36).slice(2, 6);

const avatarFileName = (extension: string) => `avatar-${Date.now().toString(36)}${randomSuffix()}.${extension}`;

function suggestId(name: string, taken: Set<string>): string {
  const ascii = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  let id = ascii.length >= 2 ? ascii.slice(0, 40) : `person-${randomSuffix()}`;
  while (taken.has(id)) id = `${id.slice(0, 34)}-${randomSuffix()}`;
  return id;
}

export default function PeopleManager({
  initialPeople,
  baseSha,
  counts,
  members,
  canLinkMembers,
}: {
  initialPeople: Person[];
  baseSha: string | null;
  counts: Record<string, number>;
  members: { id: string; displayName: string }[];
  canLinkMembers: boolean;
}) {
  const router = useRouter();
  const [people, setPeople] = useState(initialPeople);
  const [avatars, setAvatars] = useState<PendingAvatar[]>([]);
  const [newName, setNewName] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const existing = useMemo(() => new Set(initialPeople.map((person) => person.id)), [initialPeople]);
  const dirty = JSON.stringify(people) !== JSON.stringify(initialPeople);

  const update = (id: string, patch: Partial<Person>) =>
    setPeople((current) => current.map((person) => (person.id === id ? { ...person, ...patch } : person)));

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    const id = suggestId(name, new Set(people.map((person) => person.id)));
    setPeople((current) => [...current, { id, name, avatar: '', bio: '', memberId: null }]);
    setNewName('');
  };

  const setAvatar = async (person: Person, files: File[]) => {
    const [file] = files;
    if (!file) return;
    setErrors([]);
    setUploadingId(person.id);
    try {
      const { blob, extension } = await prepareImage(file);
      const fileName = avatarFileName(extension);
      const form = new FormData();
      form.set('image', new File([blob], fileName, { type: blob.type || file.type }));
      const result = await uploadImageAction(form);
      if (!result.ok) throw new ImageError(result.errors.join(' '));
      const path = `/images/people/${person.id}/${fileName}`;
      setAvatars((current) => [...current, { name: `${person.id}/${fileName}`, sha: result.value.sha, url: URL.createObjectURL(blob) }]);
      update(person.id, { avatar: path });
    } catch (error) {
      setErrors([error instanceof ImageError ? error.message : 'アイコンをアップロードできませんでした。もう一度試してください']);
    } finally {
      setUploadingId(null);
    }
  };

  const avatarSrc = (path: string) =>
    avatars.find((avatar) => path === `/images/people/${avatar.name}`)?.url ?? path;

  const save = async () => {
    setSaving(true);
    setErrors([]);
    setNotice('');
    const used = avatars.filter((avatar) => people.some((person) => person.avatar === `/images/people/${avatar.name}`));
    const result = await savePeopleAction({
      people,
      baseSha,
      images: used.map(({ name, sha }) => ({ name, sha })),
    });
    setSaving(false);
    if (!result.ok) return setErrors(result.errors);
    setNotice('保存しました。サイトへの反映は1〜2分後です。');
    router.refresh();
  };

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center gap-3'>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) add();
          }}
          placeholder='名前（サイトに表示される名前）'
          className={`${input} max-w-xs`}
        />
        <button type='button' onClick={add} disabled={!newName.trim()} className={button('secondary')}>
          ＋ 追加
        </button>
        <button type='button' onClick={save} disabled={!dirty || saving} className={`${button('primary')} ml-auto`}>
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
      {notice && <p className='rounded-md border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-900'>{notice}</p>}
      <ErrorList errors={errors} />

      <ul className='grid gap-4 md:grid-cols-2'>
        {people.map((person) => {
          const count = counts[person.id] ?? 0;
          const isNew = !existing.has(person.id);
          return (
            <li key={person.id} className={`${card} flex gap-4 p-4`}>
              <ImageDropZone
                onFiles={(files) => setAvatar(person, files)}
                label={`${person.name}のアイコンを変える`}
                className='size-20 shrink-0 overflow-hidden rounded-full!'
              >
                {person.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarSrc(person.avatar)} alt='' className='size-full object-cover' />
                ) : (
                  <span className='flex size-full items-center justify-center text-xs text-slate-500'>
                    {uploadingId === person.id ? '送信中…' : 'アイコン'}
                  </span>
                )}
              </ImageDropZone>
              <div className='min-w-0 flex-1 space-y-2.5'>
                <input
                  value={person.name}
                  onChange={(e) => update(person.id, { name: e.target.value })}
                  aria-label='名前'
                  className={`${input} font-medium`}
                />
                <div className='flex items-center gap-1.5 text-xs text-slate-500'>
                  <span className='shrink-0'>ID</span>
                  {isNew ? (
                    <input
                      value={person.id}
                      onChange={(e) => {
                        const id = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                        setPeople((current) => current.map((item) => (item === person ? { ...item, id } : item)));
                      }}
                      aria-label='ID'
                      className={`${input} h-7 font-mono text-xs`}
                    />
                  ) : (
                    <span className='font-mono'>{person.id}</span>
                  )}
                  <span className='ml-auto shrink-0'>{count}件に登場</span>
                </div>
                <textarea
                  value={person.bio}
                  onChange={(e) => update(person.id, { bio: e.target.value })}
                  placeholder='ひとこと紹介（なくてもOK）'
                  rows={2}
                  maxLength={200}
                  aria-label='紹介'
                  className={textarea}
                />
                <div className='flex flex-wrap items-center gap-2'>
                  {canLinkMembers ? (
                    <select
                      value={person.memberId ?? ''}
                      onChange={(e) => update(person.id, { memberId: e.target.value || null })}
                      aria-label='ひも付けるメンバー'
                      className={`${select} h-8 min-w-0 flex-1`}
                    >
                      <option value=''>投稿画面のアカウントなし</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          アカウント: {member.displayName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className='flex-1 text-xs text-slate-500'>
                      {person.memberId ? `アカウント: ${members.find((m) => m.id === person.memberId)?.displayName ?? '不明'}` : '投稿画面のアカウントなし'}
                    </span>
                  )}
                  {count === 0 && (
                    <button
                      type='button'
                      onClick={() => setPeople((current) => current.filter((item) => item !== person))}
                      className={button('ghost', 'sm')}
                    >
                      削除
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
