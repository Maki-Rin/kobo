export function detectImageType(data: Uint8Array): 'jpg' | 'png' | 'webp' | 'gif' | null {
  const starts = (magic: number[]) => magic.every((byte, index) => data[index] === byte);
  if (starts([0xff, 0xd8, 0xff])) return 'jpg';
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (starts([0x47, 0x49, 0x46, 0x38]) && (data[4] === 0x37 || data[4] === 0x39) && data[5] === 0x61) return 'gif';
  if (starts([0x52, 0x49, 0x46, 0x46]) && data[8] === 0x57 && data[9] === 0x45 && data[10] === 0x42 && data[11] === 0x50) return 'webp';
  return null;
}
