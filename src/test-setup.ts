import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';

// jsdom does not implement scrollIntoView; provide a no-op so click-to-jump
// (Feature 5) can be exercised and spied on in tests.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {
    /* no-op for jsdom */
  };
}

// A clean, spec-shaped localStorage for tests. The Node 25 experimental global
// shadows jsdom's and lacks a working `clear()`, so install a Map-backed
// Storage whose methods live on the prototype — that lets Feature 6's tests
// spy on `Storage.prototype.setItem` to simulate quota / unavailable failures.
class MemoryStorage {
  private data: Record<string, string> = Object.create(null);
  getItem(key: string): string | null {
    return key in this.data ? this.data[key]! : null;
  }
  setItem(key: string, value: string): void {
    this.data[String(key)] = String(value);
  }
  removeItem(key: string): void {
    delete this.data[String(key)];
  }
  clear(): void {
    this.data = Object.create(null);
  }
  key(index: number): string | null {
    return Object.keys(this.data)[index] ?? null;
  }
  get length(): number {
    return Object.keys(this.data).length;
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Storage = MemoryStorage;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).localStorage = new MemoryStorage();

// Persistence (Feature 6) makes every App-flow test that opens a document read
// localStorage — isolate them so a saved highlight never leaks into the next
// test's restore.
beforeEach(() => {
  localStorage.clear();
});
