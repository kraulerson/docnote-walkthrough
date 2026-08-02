/**
 * Structured logging (Bible §8).
 *
 * Privacy rule (Bible §10 rule 7): NEVER pass document content, note text,
 * or excerpt text in `detail` — metadata only (sizes, counts, error names).
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  ts: string;
  level: LogLevel;
  sessionId: string;
  event: string;
  detail?: Record<string, string | number | boolean>;
}

const sessionId: string = crypto.randomUUID();

/** Exposed for tests. */
export function getSessionId(): string {
  return sessionId;
}

export function buildLogEntry(
  level: LogLevel,
  event: string,
  detail?: Record<string, string | number | boolean>,
): LogEntry {
  return {
    ts: new Date().toISOString(),
    level,
    sessionId,
    event,
    ...(detail === undefined ? {} : { detail }),
  };
}

const consoleMethod: Record<LogLevel, (message: string) => void> = {
  debug: (m) => console.debug(m),
  info: (m) => console.info(m),
  warn: (m) => console.warn(m),
  error: (m) => console.error(m),
};

export function log(
  level: LogLevel,
  event: string,
  detail?: Record<string, string | number | boolean>,
): LogEntry {
  const entry = buildLogEntry(level, event, detail);
  consoleMethod[level](JSON.stringify(entry));
  return entry;
}
