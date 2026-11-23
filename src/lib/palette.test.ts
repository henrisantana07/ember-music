import sharp from 'sharp';
import { describe, it, expect } from 'vitest';
import { extractPalette } from './palette';

const solid = (r: number, g: number, b: number, w = 640, h = 360) =>
  sharp({ create: { width: w, height: h, channels: 3, background: { r, g, b } } })
    .jpeg()
    .toBuffer();

describe('extractPalette', () => {
  it('devolve hex válidos para uma capa colorida', async () => {
    const p = await extractPalette(await solid(220, 30, 30));
    expect(p.primary).toMatch(/^#[0-9a-f]{6}$/i);
    expect(p.secondary).toMatch(/^#[0-9a-f]{6}$/i);
    expect(p.isFallback).toBe(false);
  });

  it('rejeita placeholder pequeno', async () => {
    await expect(extractPalette(await solid(128, 128, 128, 120, 90))).rejects.toThrow();
  });
});
