/**
 * BUG-1 (SEV-1) — decompression-bomb guard.
 *
 * A .docx is a ZIP. The extracted-text cap in parseDocx fires only AFTER
 * mammoth has already inflated the whole document.xml, so a small compressed
 * file can materialize hundreds of MB / GB and freeze the tab. This guard
 * reads the ZIP central directory's advertised UNCOMPRESSED sizes and rejects
 * before any inflation happens. It never decompresses anything.
 *
 * ZIP format: the End Of Central Directory (EOCD) record ends the file; it
 * points at the central directory, a run of records each carrying the
 * uncompressed size of one entry at a fixed offset.
 */

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_DIR_SIGNATURE = 0x02014b50;
const EOCD_MIN_SIZE = 22;

/**
 * Returns true when the sum of advertised uncompressed entry sizes exceeds
 * `limitBytes`. Fails SAFE (returns false) when the buffer is not a parseable
 * ZIP — a non-zip is not a bomb here; mammoth will reject it as invalid-docx.
 */
export function uncompressedSizeExceeds(buffer: ArrayBuffer, limitBytes: number): boolean {
  const view = new DataView(buffer);
  const eocd = findEocd(view);
  if (eocd === null) {
    return false;
  }
  const entryCount = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true); // central directory offset
  let total = 0;
  for (let i = 0; i < entryCount; i++) {
    if (offset + 46 > view.byteLength || view.getUint32(offset, true) !== CENTRAL_DIR_SIGNATURE) {
      return false; // malformed central directory — let mammoth judge validity
    }
    total += view.getUint32(offset + 24, true); // uncompressed size (32-bit)
    if (total > limitBytes) {
      return true;
    }
    const nameLen = view.getUint16(offset + 28, true);
    const extraLen = view.getUint16(offset + 30, true);
    const commentLen = view.getUint16(offset + 32, true);
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return false;
}

/** Scan backwards for the EOCD signature (comment field forces a scan). */
function findEocd(view: DataView): number | null {
  const min = Math.max(0, view.byteLength - EOCD_MIN_SIZE - 0xffff);
  for (let i = view.byteLength - EOCD_MIN_SIZE; i >= min; i--) {
    if (view.getUint32(i, true) === EOCD_SIGNATURE) {
      return i;
    }
  }
  return null;
}

const LOCAL_HEADER_SIGNATURE = 0x04034b50;

interface ZipEntry {
  method: number;
  localHeaderOffset: number;
}

/**
 * RT-01 / BUG-32 — the ADVERTISED-size guard above can be defeated by a ZIP that
 * lies about its uncompressed sizes. This guard measures the ACTUAL inflated
 * output with a hard budget and early abort, so a lying central directory cannot
 * get a bomb past it. It never materializes more than `limitBytes` of output.
 *
 * Returns true when real inflation would exceed `limitBytes`. Fails SAFE
 * (returns false) for anything it cannot parse as a ZIP — mammoth then judges
 * validity — or when `DecompressionStream` is unavailable (the advertised-size
 * guard remains as the fallback).
 */
export async function actualUncompressedExceeds(
  buffer: ArrayBuffer,
  limitBytes: number,
): Promise<boolean> {
  if (typeof (globalThis as { DecompressionStream?: unknown }).DecompressionStream !== 'function') {
    return false; // no streaming inflate available; advertised-size guard covers us
  }
  const view = new DataView(buffer);
  const eocd = findEocd(view);
  if (eocd === null) {
    return false;
  }
  const cdStart = view.getUint32(eocd + 16, true);
  const entryCount = view.getUint16(eocd + 10, true);
  const bytes = new Uint8Array(buffer);

  // Collect entries from the central directory, then sort by local-header offset
  // so each entry's data region ends where the next entry's header begins.
  const entries: ZipEntry[] = [];
  let off = cdStart;
  for (let i = 0; i < entryCount; i++) {
    if (off + 46 > view.byteLength || view.getUint32(off, true) !== CENTRAL_DIR_SIGNATURE) {
      return false;
    }
    entries.push({
      method: view.getUint16(off + 10, true),
      localHeaderOffset: view.getUint32(off + 42, true),
    });
    const nameLen = view.getUint16(off + 28, true);
    const extraLen = view.getUint16(off + 30, true);
    const commentLen = view.getUint16(off + 32, true);
    off += 46 + nameLen + extraLen + commentLen;
  }
  entries.sort((a, b) => a.localHeaderOffset - b.localHeaderOffset);

  let total = 0;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    const lh = entry.localHeaderOffset;
    if (lh + 30 > view.byteLength || view.getUint32(lh, true) !== LOCAL_HEADER_SIGNATURE) {
      return false;
    }
    const nameLen = view.getUint16(lh + 26, true);
    const extraLen = view.getUint16(lh + 28, true);
    const dataStart = lh + 30 + nameLen + extraLen;
    const dataEnd = i + 1 < entries.length ? entries[i + 1]!.localHeaderOffset : cdStart;
    if (dataStart > dataEnd || dataEnd > view.byteLength) {
      return false;
    }
    const region = bytes.subarray(dataStart, dataEnd);
    if (entry.method === 0) {
      total += region.byteLength; // stored: output == input size
    } else if (entry.method === 8) {
      const produced = await inflatedOutputSize(region, limitBytes - total);
      if (produced === 'exceeded') {
        return true;
      }
      total += produced;
    }
    if (total > limitBytes) {
      return true;
    }
  }
  return false;
}

/**
 * Inflate a raw-deflate region, counting output bytes, aborting as soon as the
 * budget is exceeded. Trailing bytes past the deflate stream end just terminate
 * inflation (caught); the output accumulated before that is the real size.
 */
async function inflatedOutputSize(
  region: Uint8Array,
  budget: number,
): Promise<number | 'exceeded'> {
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();
  // Fire-and-forget the input; errors surface on the read side. Copy into a
  // fresh ArrayBuffer-backed view to satisfy the BufferSource chunk type.
  const chunk = new Uint8Array(region);
  void writer.write(chunk).catch(() => {});
  void writer.close().catch(() => {});
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      total += value.byteLength;
      if (total > budget) {
        void reader.cancel().catch(() => {});
        return 'exceeded';
      }
    }
  } catch {
    // Deflate stream ended (or hit trailing non-deflate bytes) — `total` holds
    // the real inflated size of the valid prefix.
  }
  return total;
}
