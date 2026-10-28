// Limit while streaming, before allocating the complete upstream response.
export async function readLimitedBody(response: Response, maximum: number): Promise<Uint8Array> {
  const length = Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length > maximum) {
    await response.body?.cancel();
    throw new Error('Response too large');
  }
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) throw new Error('Response too large');
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
