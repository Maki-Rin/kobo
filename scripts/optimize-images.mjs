import { createRequire } from 'node:module';
import { readdir, readFile, writeFile, copyFile, mkdir, unlink, stat } from 'node:fs/promises';
import path from 'node:path';

// Use the image processor already installed with this project's Next.js.
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve('next/package.json'))('sharp');
const root = path.resolve(import.meta.dirname, '..');
const apply = process.argv.includes('--write');
const manifestPath = path.join(root, 'src/lib/image-redirects.json');
const redirects = JSON.parse(await readFile(manifestPath, 'utf8'));
const people = JSON.parse(await readFile(path.join(root, 'src/content/people.json'), 'utf8'));
const avatars = new Set(people.map((person) => person.avatar));

async function files(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await files(file));
    else if (entry.isFile()) result.push(file);
  }
  return result;
}

let before = 0;
let after = 0;
let changed = 0;
for (const file of await files(path.join(root, 'public/images'))) {
  const bytes = (await stat(file)).size;
  before += bytes;
  after += bytes;
  if (!/\.(jpe?g|png)$/i.test(file)) continue;
  const url = '/' + path.relative(path.join(root, 'public'), file).split(path.sep).join('/');
  const avatar = avatars.has(url) || url.startsWith('/images/people/');
  if (!avatar && bytes < 250 * 1024) continue;
  const newUrl = url.replace(/\.[^.]+$/, '.webp');
  const destination = path.join(root, 'public', newUrl.slice(1));
  try {
    await stat(destination);
    throw new Error(`Destination already exists: ${newUrl}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const screenshot = /\.png$/i.test(file) && !/\/adventure5mpro\/print\d+\.png$/i.test(url);
  const buffer = await sharp(await readFile(file)).rotate().resize({
    width: avatar ? 256 : 2400,
    height: avatar ? 256 : 2400,
    fit: 'inside', withoutEnlargement: true,
  }).webp(screenshot && !avatar ? { lossless: true, effort: 5 } : { quality: avatar ? 80 : 84, effort: 5 }).toBuffer();
  if (buffer.length >= bytes * 0.95) continue;
  if (apply) {
    const backup = path.join(root, '.editor-local/image-originals', path.relative(path.join(root, 'public/images'), file));
    await mkdir(path.dirname(backup), { recursive: true });
    await copyFile(file, backup);
    await writeFile(destination, buffer);
    redirects[url] = newUrl;
    await writeFile(manifestPath, JSON.stringify(redirects, null, 2) + '\n');
    await unlink(file);
  }
  after += buffer.length - bytes;
  changed++;
  console.log(`${url}: ${(bytes / 1024).toFixed(0)} → ${(buffer.length / 1024).toFixed(0)} KiB`);
}

if (apply) {
  for (const file of await files(path.join(root, 'src'))) {
    if (file === manifestPath || !/\.(md|tsx?|json)$/.test(file)) continue;
    const original = await readFile(file, 'utf8');
    let content = original;
    for (const [from, to] of Object.entries(redirects)) content = content.split(from).join(to);
    if (content !== original) await writeFile(file, content);
  }
  await writeFile(manifestPath, JSON.stringify(redirects, null, 2) + '\n');
}
console.log(JSON.stringify({ apply, changed, beforeMiB: before / 1048576, afterMiB: after / 1048576, reductionPercent: (1 - after / before) * 100 }));
