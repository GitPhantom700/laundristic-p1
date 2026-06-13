// Minimal ZIP STORE-mode (no compression) encoder and decoder.
// Sufficient for our backup format: JSON manifest + binary photo/receipt files.
// No external dependencies — uses only DataView and TextEncoder/TextDecoder.

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

/** CRC-32 using the standard ZIP polynomial (0xEDB88320 reversed). */
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true);
}
function u32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value, true);
}

/**
 * Build a ZIP archive in STORE mode (no compression).
 * Each entry carries its raw bytes; the archive is a valid .zip file
 * that any standard tool can open.
 */
export function createZip(entries: ZipEntry[]): Uint8Array {
  const enc = new TextEncoder();

  const localBlocks: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  const offsets: number[] = [];
  let pos = 0;

  for (const entry of entries) {
    const nameBytes = enc.encode(entry.name);
    const fileData = entry.data;
    const checksum = crc32(fileData);
    const size = fileData.length;

    // Local file header (30 bytes) + filename + file data
    const localBlock = new Uint8Array(30 + nameBytes.length + size);
    const lv = new DataView(localBlock.buffer);
    u32(lv, 0, 0x04034b50); // signature
    u16(lv, 4, 20); // version needed: 2.0
    u16(lv, 6, 0x0800); // flags: UTF-8 filename (bit 11)
    u16(lv, 8, 0); // compression: STORE
    u16(lv, 10, 0); // last mod time
    u16(lv, 12, 0); // last mod date
    u32(lv, 14, checksum);
    u32(lv, 18, size); // compressed size
    u32(lv, 22, size); // uncompressed size
    u16(lv, 26, nameBytes.length);
    u16(lv, 28, 0); // extra field length
    localBlock.set(nameBytes, 30);
    localBlock.set(fileData, 30 + nameBytes.length);

    offsets.push(pos);
    localBlocks.push(localBlock);
    pos += localBlock.length;

    // Central directory header (46 bytes) + filename
    const ch = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(ch.buffer);
    u32(cv, 0, 0x02014b50); // signature
    u16(cv, 4, 20); // version made by
    u16(cv, 6, 20); // version needed
    u16(cv, 8, 0x0800); // flags: UTF-8
    u16(cv, 10, 0); // compression: STORE
    u16(cv, 12, 0); // last mod time
    u16(cv, 14, 0); // last mod date
    u32(cv, 16, checksum);
    u32(cv, 20, size); // compressed size
    u32(cv, 24, size); // uncompressed size
    u16(cv, 28, nameBytes.length);
    u16(cv, 30, 0); // extra field length
    u16(cv, 32, 0); // file comment length
    u16(cv, 34, 0); // disk number start
    u16(cv, 36, 0); // internal file attributes
    u32(cv, 38, 0); // external file attributes
    u32(cv, 42, offsets[offsets.length - 1]); // local header offset
    ch.set(nameBytes, 46);
    centralHeaders.push(ch);
  }

  // End of central directory record (22 bytes)
  const centralDirSize = centralHeaders.reduce((s, h) => s + h.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  u32(ev, 0, 0x06054b50); // signature
  u16(ev, 4, 0); // disk number
  u16(ev, 6, 0); // disk with central dir start
  u16(ev, 8, entries.length); // entries on this disk
  u16(ev, 10, entries.length); // total entries
  u32(ev, 12, centralDirSize); // central directory size
  u32(ev, 16, pos); // central directory offset
  u16(ev, 20, 0); // comment length

  const result = new Uint8Array(pos + centralDirSize + 22);
  let cursor = 0;
  for (const block of localBlocks) {
    result.set(block, cursor);
    cursor += block.length;
  }
  for (const ch of centralHeaders) {
    result.set(ch, cursor);
    cursor += ch.length;
  }
  result.set(eocd, cursor);
  return result;
}

/**
 * Parse a ZIP archive created by createZip (STORE mode only).
 * Scans local file headers from the start of the archive.
 * Returns a Map of filename → file bytes.
 */
export function readZip(data: Uint8Array): Map<string, Uint8Array> {
  const dec = new TextDecoder('utf-8');
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const files = new Map<string, Uint8Array>();
  let pos = 0;

  while (pos + 30 <= data.length) {
    if (view.getUint32(pos, true) !== 0x04034b50) break;

    const compMethod = view.getUint16(pos + 8, true);
    if (compMethod !== 0) {
      throw new Error(
        `ZIP entry uses compression method ${compMethod}; only STORE (0) is supported`,
      );
    }
    const compSize = view.getUint32(pos + 18, true);
    const nameLen = view.getUint16(pos + 26, true);
    const extraLen = view.getUint16(pos + 28, true);

    const nameStart = pos + 30;
    const name = dec.decode(data.subarray(nameStart, nameStart + nameLen));
    const dataStart = nameStart + nameLen + extraLen;
    files.set(name, data.slice(dataStart, dataStart + compSize));
    pos = dataStart + compSize;
  }

  return files;
}
