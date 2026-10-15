import { describe, expect, it } from 'vitest';
import { sniffMime } from '../src/sniff.js';

const pad = (bytes) => Buffer.concat([Buffer.from(bytes), Buffer.alloc(32)]);

describe('sniffMime', () => {
  it('recognises allowed types', () => {
    expect(sniffMime(pad([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]))).toBe('application/pdf');
    expect(sniffMime(pad([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(sniffMime(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(8)]);
    expect(sniffMime(webp)).toBe('image/webp');
    const heic = Buffer.concat([Buffer.alloc(4), Buffer.from('ftypheic'), Buffer.alloc(8)]);
    expect(sniffMime(heic)).toBe('image/heic');
  });

  it('rejects executables, scripts, html and tiny files', () => {
    expect(sniffMime(Buffer.from('MZ' + 'x'.repeat(40)))).toBeNull();
    expect(sniffMime(Buffer.from('<html><script>alert(1)</script></html>'))).toBeNull();
    expect(sniffMime(Buffer.from('#!/bin/sh\nrm -rf /\n\n\n'))).toBeNull();
    expect(sniffMime(Buffer.from('%PDF'))).toBeNull();
    expect(sniffMime(null)).toBeNull();
  });

  it('does not accept other RIFF containers or ftyp brands', () => {
    const wav = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVE'), Buffer.alloc(8)]);
    expect(sniffMime(wav)).toBeNull();
    const mp4 = Buffer.concat([Buffer.alloc(4), Buffer.from('ftypisom'), Buffer.alloc(8)]);
    expect(sniffMime(mp4)).toBeNull();
  });
});
