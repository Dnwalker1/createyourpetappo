import { DAY_MS, DesignRecord, availabilityLine, formatClockTime, summarizeLimits } from './limits';

const HOUR = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 24, 12, 0, 0);

function rec(hoursAgo: number, status: DesignRecord['status'], id = `${hoursAgo}-${status}`): DesignRecord {
  return { id, createdAt: NOW - hoursAgo * HOUR, status };
}

describe('summarizeLimits', () => {
  it('starts with five designs available', () => {
    const s = summarizeLimits([], NOW);
    expect(s.available).toBe(5);
    expect(s.blockedBy).toBeNull();
    expect(s.nextDesignAt).toBeNull();
  });

  it('counts only ready, flagged and ordered designs toward the five', () => {
    const s = summarizeLimits(
      [rec(1, 'ready'), rec(2, 'flagged'), rec(3, 'ordered'), rec(4, 'failed'), rec(5, 'rejected')],
      NOW,
    );
    expect(s.goodCount).toBe(3);
    expect(s.available).toBe(2);
    expect(s.attemptCount).toBe(5);
  });

  it('uses a rolling 24 hours, not a midnight reset', () => {
    const s = summarizeLimits([rec(25, 'ready'), rec(23, 'ready')], NOW);
    expect(s.goodCount).toBe(1);
    expect(s.nextDesignAt).toBe(NOW - 23 * HOUR + DAY_MS);
  });

  it('blocks at five successful designs and unlocks when the oldest expires', () => {
    const records = [rec(20, 'ready'), rec(10, 'ready'), rec(8, 'ordered'), rec(4, 'flagged'), rec(1, 'ready')];
    const s = summarizeLimits(records, NOW);
    expect(s.blockedBy).toBe('designs');
    expect(s.unlocksAt).toBe(NOW - 20 * HOUR + DAY_MS);
  });

  it('blocks at twelve attempts of any status, unlocking from the oldest attempt', () => {
    const records = Array.from({ length: 12 }, (_, i) => rec(i + 1, i === 0 ? 'ready' : 'failed'));
    const s = summarizeLimits(records, NOW);
    expect(s.available).toBe(4);
    expect(s.blockedBy).toBe('tries');
    expect(s.unlocksAt).toBe(NOW - 12 * HOUR + DAY_MS);
  });

  it('reports the five-design limit ahead of the try limit when both are hit', () => {
    const records = [
      ...Array.from({ length: 5 }, (_, i) => rec(i + 1, 'ready')),
      ...Array.from({ length: 7 }, (_, i) => rec(i + 10, 'failed')),
    ];
    expect(summarizeLimits(records, NOW).blockedBy).toBe('designs');
  });

  it('allows only one design in progress at a time', () => {
    const s = summarizeLimits([rec(0.1, 'processing')], NOW);
    expect(s.blockedBy).toBe('in-progress');
    expect(s.available).toBe(5);
  });
});

describe('wording', () => {
  it('formats local clock times', () => {
    expect(formatClockTime(Date.UTC(2026, 8, 24, 20, 14), 'UTC')).toBe('8:14 PM');
  });

  it('says how many designs are available and when the next one unlocks, never "today"', () => {
    const made = { id: 'x', createdAt: Date.UTC(2026, 8, 23, 20, 14), status: 'ready' as const };
    const s = summarizeLimits([made], Date.UTC(2026, 8, 24, 0, 0));
    const line = availabilityLine(s, 'UTC');
    expect(line).toBe('4 of 5 designs available · next one unlocks at 8:14 PM');
    expect(line).not.toMatch(/today/i);
    expect(availabilityLine(summarizeLimits([], NOW))).toBe('5 of 5 designs available');
  });
});
