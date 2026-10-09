import '@testing-library/jest-dom/vitest'

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>()
  const localStorageMock = {
    getItem: (key: string) => store.get(String(key)) ?? null,
    setItem: (key: string, value: string) => {
      store.set(String(key), String(value))
    },
    removeItem: (key: string) => {
      store.delete(String(key))
    },
    clear: () => store.clear(),
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    configurable: true,
    writable: true,
  })
}
