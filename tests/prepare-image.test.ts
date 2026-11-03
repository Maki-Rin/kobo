import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareImage } from '../src/app/admin/_components/editor/prepareImage';

test('large dimensions are reduced even for small files; avatars use their own size and preserve transparency on fallback', async (t) => {
  let supportsWebp = true;
  const canvases: { width: number; height: number }[] = [];
  t.mock.method(URL, 'createObjectURL', () => 'blob:test');
  t.mock.method(URL, 'revokeObjectURL', () => {});
  const oldImage = Object.getOwnPropertyDescriptor(globalThis, 'Image');
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'Image', { configurable: true, value: class {
    naturalWidth = 4000;
    naturalHeight = 2000;
    onload?: () => void;
    set src(_value: string) { queueMicrotask(() => this.onload?.()); }
  } });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    createElement() {
      const canvas = { width: 0, height: 0,
        getContext: () => ({ drawImage() {} }),
        toBlob: (callback: (blob: Blob) => void, type: string) => {
          callback(new Blob(['encoded'], { type: type === 'image/webp' && !supportsWebp ? 'image/png' : type }));
        },
      };
      canvases.push(canvas);
      return canvas;
    },
  } });
  try {
    const file = new File(['small high resolution image'], 'image.png', { type: 'image/png' });
    const article = await prepareImage(file);
    assert.equal(article.extension, 'webp');
    assert.equal(canvases[0].width, 1920);
    assert.equal(canvases[0].height, 960);
    await prepareImage(file, 'avatar');
    assert.equal(canvases[1].width, 256);
    assert.equal(canvases[1].height, 128);
    supportsWebp = false;
    const fallback = await prepareImage(file, 'avatar');
    assert.equal(fallback.extension, 'png');
    assert.equal(fallback.blob.type, 'image/png');
    const gif = new File(['animated'], 'animation.gif', { type: 'image/gif' });
    assert.equal((await prepareImage(gif)).blob, gif);
  } finally {
    if (oldImage) Object.defineProperty(globalThis, 'Image', oldImage);
    else Reflect.deleteProperty(globalThis, 'Image');
    if (oldDocument) Object.defineProperty(globalThis, 'document', oldDocument);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});
