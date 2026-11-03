import { parseArgs } from 'node:util';
import { createInvite, type Role } from '../src/lib/editor/auth';
import { editorConfig } from '../src/lib/editor/config';

const { values } = parseArgs({
  options: {
    name: { type: 'string' },
    role: { type: 'string', default: 'lead' },
  },
});

if (!values.name || !['editor', 'lead', 'developer'].includes(values.role ?? '')) {
  console.error('使い方: npm run editor:invite -- --name "名前" [--role lead|editor|developer]');
  process.exit(1);
}

const token = await createInvite({
  kind: 'register',
  displayName: values.name,
  role: values.role as Role,
  createdBy: null,
});
console.log(`${editorConfig().origin}/admin/invite/${token}`);
