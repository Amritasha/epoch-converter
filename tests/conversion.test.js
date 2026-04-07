/**
 * Tests for toEpoch and fromEpoch — the popup conversion logic.
 */

const { toEpoch, fromEpoch } = require('./lib');

// ─── toEpoch ─────────────────────────────────────────────────────────────────

describe('toEpoch — IST input', () => {
  test('returns object with epochMs, epochSec, istStr, gmtStr', () => {
    const r = toEpoch('2026-04-07', '09:30:00', 'ist');
    expect(r).not.toBeNull();
    expect(typeof r.epochMs).toBe('number');
    expect(typeof r.epochSec).toBe('number');
    expect(r.istStr).toMatch(/IST$/);
    expect(r.gmtStr).toMatch(/UTC$/);
  });

  test('IST 00:00:00 on 2026-01-01 = UTC 2025-12-31 18:30:00', () => {
    const r = toEpoch('2026-01-01', '00:00:00', 'ist');
    expect(r.gmtStr).toBe('2025-12-31 18:30:00 UTC');
  });

  test('IST 05:30:00 on 2026-04-07 = UTC 00:00:00 same day', () => {
    const r = toEpoch('2026-04-07', '05:30:00', 'ist');
    expect(r.gmtStr).toBe('2026-04-07 00:00:00 UTC');
  });

  test('epochSec = floor(epochMs / 1000)', () => {
    const r = toEpoch('2026-04-07', '12:00:00', 'ist');
    expect(r.epochSec).toBe(Math.floor(r.epochMs / 1000));
  });

  test('istStr reflects the original IST input time', () => {
    const r = toEpoch('2026-04-07', '14:38:00', 'ist');
    expect(r.istStr).toBe('2026-04-07 14:38:00 IST');
  });

  test('time defaults to 00:00:00 when omitted', () => {
    const r = toEpoch('2026-04-07', '', 'ist');
    expect(r).not.toBeNull();
    expect(r.istStr).toBe('2026-04-07 00:00:00 IST');
  });

  test('missing date returns null', () => {
    expect(toEpoch('', '09:00:00', 'ist')).toBeNull();
    expect(toEpoch(null, '09:00:00', 'ist')).toBeNull();
  });

  test('invalid date string returns null', () => {
    expect(toEpoch('not-a-date', '09:00:00', 'ist')).toBeNull();
  });
});

describe('toEpoch — GMT/UTC input', () => {
  test('UTC 00:00:00 on 2026-01-01 = IST 05:30:00 same day', () => {
    const r = toEpoch('2026-01-01', '00:00:00', 'gmt');
    expect(r.istStr).toBe('2026-01-01 05:30:00 IST');
  });

  test('UTC 18:30:00 on 2026-04-07 = IST 00:00:00 next day', () => {
    const r = toEpoch('2026-04-07', '18:30:00', 'gmt');
    expect(r.istStr).toBe('2026-04-08 00:00:00 IST');
  });

  test('gmtStr reflects the original UTC input time', () => {
    const r = toEpoch('2026-04-07', '09:08:31', 'gmt');
    expect(r.gmtStr).toBe('2026-04-07 09:08:31 UTC');
  });

  test('epoch is consistent with known reference', () => {
    // 2026-04-07 00:00:00 UTC = 1775520000 s
    const r = toEpoch('2026-04-07', '00:00:00', 'gmt');
    expect(r.epochMs).toBe(1775520000000);
    expect(r.epochSec).toBe(1775520000);
  });
});

// ─── fromEpoch ───────────────────────────────────────────────────────────────

describe('fromEpoch — seconds input (10 digits)', () => {
  test('returns correct IST and UTC strings', () => {
    // 1775520000 = 2026-04-07 00:00:00 UTC = 2026-04-07 05:30:00 IST
    const r = fromEpoch('1775520000');
    expect(r).not.toBeNull();
    expect(r.gmtStr).toBe('2026-04-07 00:00:00 UTC');
    expect(r.istStr).toBe('2026-04-07 05:30:00 IST');
  });

  test('epochMs = epochSec * 1000', () => {
    const r = fromEpoch('1775520000');
    expect(r.epochMs).toBe(1775520000 * 1000);
    expect(r.epochSec).toBe(1775520000);
  });

  test('returns correct day of week (UTC)', () => {
    // 2026-04-07 is a Tuesday
    const r = fromEpoch('1775520000');
    expect(r.dayUTC).toBe('Tuesday');
  });

  test('returns correct day of week (IST)', () => {
    const r = fromEpoch('1775520000');
    expect(r.dayIST).toBe('Tuesday');
  });
});

describe('fromEpoch — milliseconds input (13 digits)', () => {
  test('accepts 13-digit ms epoch', () => {
    const r = fromEpoch('1775520000000');
    expect(r).not.toBeNull();
    expect(r.gmtStr).toBe('2026-04-07 00:00:00 UTC');
  });

  test('epochSec = floor(epochMs / 1000)', () => {
    const r = fromEpoch('1775520000500');
    expect(r.epochSec).toBe(1775520000);
    expect(r.epochMs).toBe(1775520000500);
  });
});

describe('fromEpoch — boundary and edge cases', () => {
  test('epoch 0 = Unix epoch start (1970-01-01 00:00:00 UTC)', () => {
    const r = fromEpoch('0');
    expect(r.gmtStr).toBe('1970-01-01 00:00:00 UTC');
  });

  test('IST day can differ from UTC day near midnight UTC', () => {
    // 2026-04-07 20:00:00 UTC → IST = 2026-04-08 01:30:00 IST (next day)
    const r = fromEpoch('1775592000'); // 2026-04-07 20:00:00 UTC
    expect(r.dayUTC).toBe('Tuesday');
    expect(r.dayIST).toBe('Wednesday');
  });
});

describe('fromEpoch — invalid inputs', () => {
  test('empty string returns null', () => expect(fromEpoch('')).toBeNull());
  test('non-numeric string returns null', () => expect(fromEpoch('abc')).toBeNull());
  test('float string returns null', () => expect(fromEpoch('1744156800.5')).toBeNull());
  test('null returns null', () => expect(fromEpoch(null)).toBeNull());
  test('undefined returns null', () => expect(fromEpoch(undefined)).toBeNull());
  test('negative number string returns null', () => expect(fromEpoch('-1')).toBeNull());
});
