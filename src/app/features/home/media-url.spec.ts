import { withVersion } from './media-url';

describe('withVersion', () => {
  const versions = { 'demo/board-light.webp': 'a1b2c3d4' };

  it('adds the content fingerprint of a known file to its URL', () => {
    expect(withVersion('/demo/board-light.webp', versions)).toBe(
      '/demo/board-light.webp?v=a1b2c3d4',
    );
  });

  it('leaves an unknown file untouched', () => {
    expect(withVersion('/demo/inconnu.webm', versions)).toBe('/demo/inconnu.webm');
  });
});
