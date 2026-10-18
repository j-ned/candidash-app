import { readViewPreference, writeViewPreference, VIEW_STORAGE_KEY } from './view-preference';

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

function throwingStorage(): Storage {
  const fail = (): never => {
    throw new DOMException('denied', 'SecurityError');
  };
  return { length: 0, clear: fail, getItem: fail, key: fail, removeItem: fail, setItem: fail };
}

describe('view-preference', () => {
  it.each<[string, Record<string, string>, 'list' | 'board']>([
    ['nothing stored', {}, 'list'],
    ['board stored', { [VIEW_STORAGE_KEY]: 'board' }, 'board'],
    ['list stored', { [VIEW_STORAGE_KEY]: 'list' }, 'list'],
    ['an unknown value stored', { [VIEW_STORAGE_KEY]: 'grid' }, 'list'],
  ])('Given %s, reads the expected view', (_label, initial, expected) => {
    expect(readViewPreference(memoryStorage(initial))).toBe(expected);
  });

  it('falls back on the list when storage is unavailable (SSR) or throws (private mode)', () => {
    expect(readViewPreference(undefined)).toBe('list');
    expect(readViewPreference(throwingStorage())).toBe('list');
  });

  it('remembers the chosen view', () => {
    // Given
    const storage = memoryStorage();

    // When
    writeViewPreference(storage, 'board');

    // Then
    expect(storage.getItem(VIEW_STORAGE_KEY)).toBe('board');
    expect(readViewPreference(storage)).toBe('board');
  });

  it('ignores a storage that throws when writing', () => {
    expect(() => writeViewPreference(throwingStorage(), 'board')).not.toThrow();
    expect(() => writeViewPreference(undefined, 'board')).not.toThrow();
  });
});
