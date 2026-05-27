export type AdDiagnosticPayload = {
  code?: unknown;
  message?: unknown;
  userInfo?: unknown;
  stack?: unknown;
  adUnitId?: unknown;
};

export type AdDiagnosticLogEntry = {
  id: number;
  atMs: number;
  message: string;
};

type AdDiagnosticListener = () => void;

const MAX_AD_DIAGNOSTIC_LOG_ENTRIES = 12;

let nextEntryId = 1;
let entries: AdDiagnosticLogEntry[] = [];
const listeners = new Set<AdDiagnosticListener>();

function formatValue(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value.includes(' ') || value.includes('[') ? JSON.stringify(value) : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function formatAdDiagnosticPayload(payload: unknown) {
  const value = payload as AdDiagnosticPayload | undefined;
  const pairs = [
    ['code', formatValue(value?.code)],
    ['message', formatValue(value?.message)],
    ['userInfo', formatValue(value?.userInfo)],
    ['adUnitId', formatValue(value?.adUnitId)],
  ].filter((entry): entry is [string, string] => typeof entry[1] === 'string');

  if (pairs.length === 0) {
    return payload === undefined ? '' : ` payload=${formatValue(payload)}`;
  }

  return ` ${pairs.map(([key, formattedValue]) => `${key}=${formattedValue}`).join(' ')}`;
}

function notifyAdDiagnosticListeners() {
  listeners.forEach(listener => {
    listener();
  });
}

export function recordAdDiagnosticLog(
  event: string,
  payload?: unknown,
  atMs = Date.now(),
) {
  const entry = {
    id: nextEntryId,
    atMs,
    message: `${event}${formatAdDiagnosticPayload(payload)}`,
  };
  nextEntryId += 1;
  entries = [entry, ...entries].slice(0, MAX_AD_DIAGNOSTIC_LOG_ENTRIES);
  console.warn('[WinkTimerAds]', entry.message);
  notifyAdDiagnosticListeners();
  return entry;
}

export function getAdDiagnosticLogEntries() {
  return entries;
}

export function getAdDiagnosticLogText(
  logEntries: readonly AdDiagnosticLogEntry[],
) {
  return logEntries
    .map(entry => `[${new Date(entry.atMs).toISOString()}] ${entry.message}`)
    .join('\n');
}

export function subscribeAdDiagnosticLogs(listener: AdDiagnosticListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetAdDiagnosticLogsForTests() {
  nextEntryId = 1;
  entries = [];
  notifyAdDiagnosticListeners();
}
