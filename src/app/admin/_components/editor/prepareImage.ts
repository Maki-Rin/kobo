const MAX_EDGE = 1920;
const KEEP_AS_IS_BYTES = 1024 * 1024;
const MAX_INPUT_BYTES = 30 * 1024 * 1024;

const extensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export class ImageError extends Error {}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ImageError('decode'));
    };
    image.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new ImageError('encode'))), type, quality)
  );
}

export async function prepareImage(file: File): Promise<{ blob: Blob; extension: string }> {
  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageError(`「${file.name}」は大きすぎます（30MBまで）`);
  }
  const extension = extensions[file.type];
  if (extension && (file.size <= KEEP_AS_IS_BYTES || file.type === 'image/gif')) {
    if (file.type === 'image/gif' && file.size > 3 * 1024 * 1024) {
      throw new ImageError(`GIF「${file.name}」は3MBまでです`);
    }
    return { blob: file, extension };
  }

  let image: HTMLImageElement;
  try {
    image = await loadImage(file);
  } catch {
    const heic = /hei[cf]$/i.test(file.name) || /hei[cf]/.test(file.type);
    throw new ImageError(
      heic
        ? `「${file.name}」（iPhoneのHEIC形式）はこのブラウザで読み込めません。Safariで開くか、写真アプリでJPEGとして書き出してください`
        : `「${file.name}」は画像として読み込めませんでした（JPEG・PNG・WebP・GIF・HEIC）`
    );
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);

  if (file.type === 'image/png') {
    const webp = await toBlob(canvas, 'image/webp', 0.9);
    if (webp.type === 'image/webp') return { blob: webp, extension: 'webp' };
  }
  return { blob: await toBlob(canvas, 'image/jpeg', 0.85), extension: 'jpg' };
}

export function imageFiles(list: FileList | File[] | null | undefined): File[] {
  return [...(list ?? [])].filter(
    (file) => file.type.startsWith('image/') || /\.(hei[cf]|jpe?g|png|webp|gif)$/i.test(file.name)
  );
}
