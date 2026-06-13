import { describe, it, expect } from 'vitest';
import { createZip, readZip } from '../src/lib/zip';

function text(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

describe('createZip / readZip round-trip', () => {
  it('encodes and decodes a single text entry', () => {
    const zip = createZip([{ name: 'hello.txt', data: text('hello world') }]);
    const files = readZip(zip);
    expect(files.size).toBe(1);
    expect(new TextDecoder().decode(files.get('hello.txt')!)).toBe(
      'hello world',
    );
  });

  it('handles multiple entries including binary data', () => {
    const binary = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x01, 0x02]);
    const entries = [
      { name: 'backup.json', data: text('{"version":1}') },
      { name: 'photos/g-001.jpg', data: binary },
      {
        name: 'receipts/b-001.jpg',
        data: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      },
    ];
    const zip = createZip(entries);
    const files = readZip(zip);

    expect(files.size).toBe(3);
    expect(new TextDecoder().decode(files.get('backup.json')!)).toBe(
      '{"version":1}',
    );
    expect(files.get('photos/g-001.jpg')).toEqual(binary);
  });

  it('handles an empty archive', () => {
    const zip = createZip([]);
    const files = readZip(zip);
    expect(files.size).toBe(0);
  });

  it('handles empty file data', () => {
    const zip = createZip([{ name: 'empty.txt', data: new Uint8Array(0) }]);
    const files = readZip(zip);
    expect(files.get('empty.txt')).toEqual(new Uint8Array(0));
  });

  it('handles UTF-8 filenames', () => {
    const zip = createZip([{ name: 'photos/g-über.jpg', data: text('data') }]);
    const files = readZip(zip);
    expect(files.has('photos/g-über.jpg')).toBe(true);
  });

  it('produces a valid ZIP magic number', () => {
    const zip = createZip([{ name: 'a.txt', data: text('a') }]);
    // Local file header signature: PK\x03\x04
    expect(zip[0]).toBe(0x50); // P
    expect(zip[1]).toBe(0x4b); // K
    expect(zip[2]).toBe(0x03);
    expect(zip[3]).toBe(0x04);
  });

  it('throws on compressed entries', () => {
    // Manually craft a local header with compression method = 8 (DEFLATE)
    const header = new Uint8Array(30 + 5); // 'a.txt' = 5 bytes
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(8, 8, true); // compression method = DEFLATE
    view.setUint16(26, 5, true); // name length
    header.set(new TextEncoder().encode('a.txt'), 30);
    // Append EOCD so the parser sees a valid end
    const eocd = new Uint8Array(22);
    new DataView(eocd.buffer).setUint32(0, 0x06054b50, true);
    const combined = new Uint8Array(header.length + eocd.length);
    combined.set(header, 0);
    combined.set(eocd, header.length);

    expect(() => readZip(combined)).toThrow('compression method');
  });
});
