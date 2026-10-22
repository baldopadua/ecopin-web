import 'server-only';

export async function readBoundedJson(body, maxBytes, signal) {
  const bytes = await readBoundedBytes(body, maxBytes, signal);
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

export async function readBoundedBytes(body, maxBytes, signal) {
  signal?.throwIfAborted();
  if (!body) throw new SyntaxError('Missing JSON body');
  const reader = body.getReader();
  let onAbort;
  const aborted = new Promise((_, reject) => {
    onAbort = () => reject(signal.reason);
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) onAbort();
  });
  try {
    const bytes = new Uint8Array(maxBytes);
    let size = 0;
    while (true) {
      const { done, value } = await Promise.race([reader.read(), aborted]);
      if (done) break;
      if (size + value.byteLength > maxBytes) throw new RangeError('JSON body too large');
      bytes.set(value, size);
      size += value.byteLength;
    }
    signal?.throwIfAborted();
    return bytes.subarray(0, size);
  } finally {
    signal?.removeEventListener('abort', onAbort);
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
