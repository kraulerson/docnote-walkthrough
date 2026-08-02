import { describe, expect, it, vi } from 'vitest';
import { buildLogEntry, getSessionId, log } from './log';

describe('structured logging (Bible §8)', () => {
  it('should produce entries with ts, level, sessionId, and event', () => {
    const entry = buildLogEntry('info', 'parse.start', { bytes: 1234 });
    expect(entry.level).toBe('info');
    expect(entry.event).toBe('parse.start');
    expect(entry.sessionId).toBe(getSessionId());
    expect(entry.detail).toEqual({ bytes: 1234 });
    expect(Number.isNaN(Date.parse(entry.ts))).toBe(false);
  });

  it('should keep one stable correlation id per page load', () => {
    const a = buildLogEntry('debug', 'a');
    const b = buildLogEntry('error', 'b');
    expect(a.sessionId).toBe(b.sessionId);
    expect(a.sessionId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('should emit a single JSON line on the matching console channel', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const entry = log('warn', 'storage.quota_exceeded', { savedBytes: 0 });
    expect(spy).toHaveBeenCalledTimes(1);
    const printed: unknown = JSON.parse(spy.mock.calls[0]?.[0] as string);
    expect(printed).toEqual(entry);
    spy.mockRestore();
  });

  it('should omit the detail key entirely when no detail is given', () => {
    const entry = buildLogEntry('info', 'noop');
    expect('detail' in entry).toBe(false);
  });
});
