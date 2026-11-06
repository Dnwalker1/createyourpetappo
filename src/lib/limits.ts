// Design limits, shared with the website backend (petDesigns.js). The backend
// enforces them; the app uses the same rules to explain them to the customer.
// See docs/app-spec.md > Generation limits.

export const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_GOOD_DESIGNS = 5;
export const MAX_ATTEMPTS = 12;

export type DesignStatus = 'processing' | 'ready' | 'flagged' | 'ordered' | 'failed' | 'rejected';

export type DesignRecord = {
  id: string;
  createdAt: number; // ms since epoch
  status: DesignStatus;
};

// Statuses that count toward the 5 (countGoodDesignsForVisitor).
const GOOD: DesignStatus[] = ['ready', 'flagged', 'ordered'];

export type LimitBlock = 'in-progress' | 'designs' | 'tries';

export type LimitSummary = {
  /** Successful designs left in the rolling 24 hours (0–5). */
  available: number;
  goodCount: number;
  attemptCount: number;
  inProgress: boolean;
  /** When the oldest successful design stops counting, or null if none count. */
  nextDesignAt: number | null;
  /** When the oldest attempt stops counting, or null if none count. */
  nextTryAt: number | null;
  /** Why Generate is unavailable right now, if it is. */
  blockedBy: LimitBlock | null;
  /** The unlock time for the limit that was hit. */
  unlocksAt: number | null;
};

export function summarizeLimits(records: DesignRecord[], now: number): LimitSummary {
  const recent = records.filter((r) => r.createdAt > now - DAY_MS && r.createdAt <= now);
  const good = recent.filter((r) => GOOD.includes(r.status));
  const oldest = (rs: DesignRecord[]) => (rs.length ? Math.min(...rs.map((r) => r.createdAt)) + DAY_MS : null);

  const nextDesignAt = oldest(good);
  const nextTryAt = oldest(recent);
  const inProgress = recent.some((r) => r.status === 'processing');

  let blockedBy: LimitBlock | null = null;
  let unlocksAt: number | null = null;
  if (inProgress) {
    blockedBy = 'in-progress';
  } else if (good.length >= MAX_GOOD_DESIGNS) {
    blockedBy = 'designs';
    unlocksAt = nextDesignAt;
  } else if (recent.length >= MAX_ATTEMPTS) {
    blockedBy = 'tries';
    unlocksAt = nextTryAt;
  }

  return {
    available: Math.max(0, MAX_GOOD_DESIGNS - good.length),
    goodCount: good.length,
    attemptCount: recent.length,
    inProgress,
    nextDesignAt,
    nextTryAt,
    blockedBy,
    unlocksAt,
  };
}

// "8:14 PM" in the customer's local time.
export function formatClockTime(ms: number, timeZone?: string): string {
  return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone });
}

// The day an unlock falls on, in the customer's local time: '' for later
// today, 'tomorrow', or a weekday name (only if the clock is far off).
//
// Added 6 Nov 2026 after testers read "next one unlocks at 7:30 AM" at 7:34 AM
// as already past; it meant 7:30 tomorrow. Later-today times stay bare, so the
// limit is still never described as "today".
export function unlockDay(ms: number, now: number = Date.now(), timeZone?: string): string {
  const day = (t: number) => new Date(t).toLocaleDateString('en-CA', { timeZone });
  if (day(ms) === day(now)) return '';
  if (day(ms) === day(now + DAY_MS)) return 'tomorrow';
  return new Date(ms).toLocaleDateString('en-US', { weekday: 'long', timeZone });
}

// "at 8:14 PM" or "tomorrow at 7:30 AM".
export function formatUnlock(ms: number, now: number = Date.now(), timeZone?: string): string {
  const day = unlockDay(ms, now, timeZone);
  return `${day ? `${day} ` : ''}at ${formatClockTime(ms, timeZone)}`;
}

// "3 of 5 designs available · next one unlocks tomorrow at 8:14 PM".
export function availabilityLine(summary: LimitSummary, timeZone?: string, now: number = Date.now()): string {
  const base = `${summary.available} of ${MAX_GOOD_DESIGNS} designs available`;
  if (summary.available < MAX_GOOD_DESIGNS && summary.nextDesignAt) {
    return `${base} · next one unlocks ${formatUnlock(summary.nextDesignAt, now, timeZone)}`;
  }
  return base;
}
