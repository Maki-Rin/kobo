import peopleData from '@/content/people.json';

export interface Person {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  memberId: string | null;
}

export const people = peopleData as Person[];

export function resolvePeople(ids: string[], list: Person[] = people): Person[] {
  return ids.map((id) => list.find((person) => person.id === id) ?? { id, name: id, avatar: '', bio: '', memberId: null });
}

export function peopleNames(ids: string[], fallback = '', list: Person[] = people): string {
  return ids.length > 0 ? resolvePeople(ids, list).map((person) => person.name).join('、') : fallback;
}
