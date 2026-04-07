/**
 * Tests for parseHumanDatetime — the content-script parser that handles
 * all the human-readable date/time formats a user might select on a webpage.
 */

const { parseHumanDatetime, isEpoch } = require('./lib');

// Helper: given an epoch ms, return the UTC ISO string slice for comparison
function utcStr(epochMs) {
  return new Date(epochMs).toISOString(); // e.g. "2026-04-07T09:08:31.000Z"
}

// ─── Epoch number detection ──────────────────────────────────────────────────

describe('isEpoch', () => {
  test('accepts 10-digit seconds', () => expect(isEpoch('1712345678')).toBe(true));
  test('accepts 13-digit milliseconds', () => expect(isEpoch('1712345678000')).toBe(true));
  test('rejects 9-digit number', () => expect(isEpoch('171234567')).toBe(false));
  test('rejects 11-digit number', () => expect(isEpoch('17123456789')).toBe(false));
  test('rejects non-numeric', () => expect(isEpoch('abc')).toBe(false));
  test('rejects float', () => expect(isEpoch('1712345678.0')).toBe(false));
  test('rejects empty string', () => expect(isEpoch('')).toBe(false));
});

// ─── UTC — sentence form ─────────────────────────────────────────────────────

describe('parseHumanDatetime — sentence form (UTC)', () => {
  // "UTC current time is 09:08:31\nUTC current date is 7th Tuesday April 2026."
  const raw = 'UTC current time is 09:08:31\nUTC current date is 7th Tuesday April 2026.';

  test('returns a number', () => {
    expect(typeof parseHumanDatetime(raw)).toBe('number');
  });

  test('parses to correct UTC datetime', () => {
    const ms = parseHumanDatetime(raw);
    expect(utcStr(ms)).toBe('2026-04-07T09:08:31.000Z');
  });
});

// ─── UTC — compact form ──────────────────────────────────────────────────────

describe('parseHumanDatetime — compact UTC (time then date)', () => {
  // "09:09:01 UTC\nTuesday, 7 April 2026"
  const raw = '09:09:01 UTC\nTuesday, 7 April 2026';

  test('parses to correct UTC datetime', () => {
    const ms = parseHumanDatetime(raw);
    expect(utcStr(ms)).toBe('2026-04-07T09:09:01.000Z');
  });
});

// ─── IST — 12-hour with Indian Standard Time label ───────────────────────────

describe('parseHumanDatetime — IST 12-hour format', () => {
  // "2:38 pm\nTuesday, 7 April 2026\nIndian Standard Time (IST)"
  const raw = '2:38 pm\nTuesday, 7 April 2026\nIndian Standard Time (IST)';

  test('returns a number', () => {
    expect(typeof parseHumanDatetime(raw)).toBe('number');
  });

  test('IST 2:38 pm = UTC 09:08', () => {
    // IST is UTC+5:30, so 14:38 IST = 09:08 UTC
    const ms = parseHumanDatetime(raw);
    expect(utcStr(ms)).toBe('2026-04-07T09:08:00.000Z');
  });
});

// ─── 12-hour edge cases ──────────────────────────────────────────────────────

describe('parseHumanDatetime — 12-hour edge cases', () => {
  test('12:00 am = midnight UTC', () => {
    const ms = parseHumanDatetime('12:00 am\n1 January 2026\nUTC');
    expect(utcStr(ms)).toBe('2026-01-01T00:00:00.000Z');
  });

  test('12:00 pm = noon UTC', () => {
    const ms = parseHumanDatetime('12:00 pm\n1 January 2026\nUTC');
    expect(utcStr(ms)).toBe('2026-01-01T12:00:00.000Z');
  });

  test('12:30 am = 00:30 UTC', () => {
    const ms = parseHumanDatetime('12:30 am\n1 January 2026\nUTC');
    expect(utcStr(ms)).toBe('2026-01-01T00:30:00.000Z');
  });

  test('11:59 pm = 23:59 UTC', () => {
    const ms = parseHumanDatetime('11:59 pm\n1 January 2026\nUTC');
    expect(utcStr(ms)).toBe('2026-01-01T23:59:00.000Z');
  });

  test('1:05 AM (uppercase) UTC', () => {
    const ms = parseHumanDatetime('1:05 AM\n15 March 2025\nUTC');
    expect(utcStr(ms)).toBe('2025-03-15T01:05:00.000Z');
  });
});

// ─── Ordinal suffixes ────────────────────────────────────────────────────────

describe('parseHumanDatetime — ordinal day suffixes', () => {
  test('1st', () => {
    const ms = parseHumanDatetime('00:00:00 UTC\n1st January 2026');
    expect(utcStr(ms)).toBe('2026-01-01T00:00:00.000Z');
  });

  test('2nd', () => {
    const ms = parseHumanDatetime('00:00:00 UTC\n2nd February 2026');
    expect(utcStr(ms)).toBe('2026-02-02T00:00:00.000Z');
  });

  test('3rd', () => {
    const ms = parseHumanDatetime('00:00:00 UTC\n3rd March 2026');
    expect(utcStr(ms)).toBe('2026-03-03T00:00:00.000Z');
  });

  test('21st', () => {
    const ms = parseHumanDatetime('00:00:00 UTC\n21st April 2026');
    expect(utcStr(ms)).toBe('2026-04-21T00:00:00.000Z');
  });
});

// ─── Date format variants ────────────────────────────────────────────────────

describe('parseHumanDatetime — date format variants', () => {
  test('D Month YYYY', () => {
    const ms = parseHumanDatetime('10:00:00 UTC\n7 April 2026');
    expect(utcStr(ms)).toBe('2026-04-07T10:00:00.000Z');
  });

  test('Month D YYYY', () => {
    const ms = parseHumanDatetime('10:00:00 UTC\nApril 7 2026');
    expect(utcStr(ms)).toBe('2026-04-07T10:00:00.000Z');
  });

  test('ISO YYYY-MM-DD', () => {
    const ms = parseHumanDatetime('10:00:00 UTC\n2026-04-07');
    expect(utcStr(ms)).toBe('2026-04-07T10:00:00.000Z');
  });

  test('abbreviated month name (Apr)', () => {
    const ms = parseHumanDatetime('10:00:00 UTC\n7 Apr 2026');
    expect(utcStr(ms)).toBe('2026-04-07T10:00:00.000Z');
  });

  test('abbreviated month name (May)', () => {
    const ms = parseHumanDatetime('10:00:00 UTC\n7 May 2026');
    expect(utcStr(ms)).toBe('2026-05-07T10:00:00.000Z');
  });

  test('day name is ignored', () => {
    const ms = parseHumanDatetime('10:00:00 UTC\nMonday, 7 April 2026');
    expect(utcStr(ms)).toBe('2026-04-07T10:00:00.000Z');
  });
});

// ─── Timezone variants ───────────────────────────────────────────────────────

describe('parseHumanDatetime — timezone variants', () => {
  test('IST keyword → UTC+5:30 offset applied', () => {
    // 00:00:00 IST = 18:30:00 UTC previous day
    const ms = parseHumanDatetime('00:00:00 IST\n1 January 2026');
    expect(utcStr(ms)).toBe('2025-12-31T18:30:00.000Z');
  });

  test('Indian Standard Time (long form)', () => {
    const ms = parseHumanDatetime('06:00:00\n7 April 2026\nIndian Standard Time');
    expect(utcStr(ms)).toBe('2026-04-07T00:30:00.000Z');
  });

  test('(IST) in parentheses', () => {
    const ms = parseHumanDatetime('06:00:00\n7 April 2026\n(IST)');
    expect(utcStr(ms)).toBe('2026-04-07T00:30:00.000Z');
  });

  test('GMT keyword treated as UTC', () => {
    const ms = parseHumanDatetime('10:00:00 GMT\n7 April 2026');
    expect(utcStr(ms)).toBe('2026-04-07T10:00:00.000Z');
  });

  test('no timezone keyword → defaults to UTC', () => {
    const ms = parseHumanDatetime('10:00:00\n7 April 2026');
    expect(utcStr(ms)).toBe('2026-04-07T10:00:00.000Z');
  });
});

// ─── Invalid / unparseable inputs ────────────────────────────────────────────

describe('parseHumanDatetime — invalid inputs', () => {
  test('plain text returns null', () => expect(parseHumanDatetime('hello world')).toBeNull());
  test('only a time (no date) returns null', () => expect(parseHumanDatetime('09:08:31')).toBeNull());
  test('only a date (no time) returns null', () => expect(parseHumanDatetime('7 April 2026')).toBeNull());
  test('empty string returns null', () => expect(parseHumanDatetime('')).toBeNull());
  test('invalid month returns null', () => expect(parseHumanDatetime('10:00:00 UTC\n7 Octember 2026')).toBeNull());
});
