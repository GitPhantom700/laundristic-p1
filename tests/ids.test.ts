import { describe, it, expect } from 'vitest';
import { generateId, generateCode } from '../src/lib/ids';

describe('generateId', () => {
  it('returns a non-empty string', () => {
    expect(typeof generateId()).toBe('string');
    expect(generateId().length).toBeGreaterThan(0);
  });

  it('returns unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe('generateCode', () => {
  it('returns PREFIX-01 when no existing codes', () => {
    expect(generateCode('SHT', [])).toBe('SHT-01');
  });

  it('returns max+1 for a given prefix', () => {
    expect(generateCode('SHT', ['SHT-01', 'SHT-02', 'SHT-03'])).toBe('SHT-04');
  });

  it('only counts codes matching the given prefix', () => {
    expect(generateCode('TEE', ['SHT-01', 'SHT-02', 'TEE-01'])).toBe('TEE-02');
  });

  it('ignores codes from other prefixes entirely', () => {
    expect(generateCode('HOO', ['SHT-01', 'TEE-05'])).toBe('HOO-01');
  });

  it('handles gaps in numbering by using max', () => {
    expect(generateCode('SHT', ['SHT-01', 'SHT-05'])).toBe('SHT-06');
  });

  it('zero-pads single digit numbers', () => {
    const code = generateCode('TRO', []);
    expect(code).toBe('TRO-01');
  });

  it('does not pad numbers >= 10', () => {
    const existing = Array.from({ length: 9 }, (_, i) => `BED-0${i + 1}`);
    expect(generateCode('BED', existing)).toBe('BED-10');
  });
});
