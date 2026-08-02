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
