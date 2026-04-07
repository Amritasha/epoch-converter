/**
 * Tests for relativeTime — formats a millisecond diff into a human string.
 */

const { relativeTime } = require('./lib');

describe('relativeTime — past (positive diffMs)', () => {
  test('0 seconds', () => expect(relativeTime(0)).toBe('0 seconds ago'));
  test('1 second',  () => expect(relativeTime(1000)).toBe('1 second ago'));
  test('30 seconds', () => expect(relativeTime(30 * 1000)).toBe('30 seconds ago'));
  test('59 seconds', () => expect(relativeTime(59 * 1000)).toBe('59 seconds ago'));

  test('1 minute exactly', () => expect(relativeTime(60 * 1000)).toBe('1 minute ago'));
  test('1 minute 30s',     () => expect(relativeTime(90 * 1000)).toBe('1 minute 30s ago'));
  test('2 minutes',        () => expect(relativeTime(2 * 60 * 1000)).toBe('2 minutes ago'));
  test('59 minutes 59s',   () => expect(relativeTime((59 * 60 + 59) * 1000)).toBe('59 minutes 59s ago'));

  test('1 hour exactly',   () => expect(relativeTime(3600 * 1000)).toBe('1 hour ago'));
  test('1 hour 30 min',    () => expect(relativeTime((3600 + 1800) * 1000)).toBe('1 hour 30 min ago'));
  test('2 hours',          () => expect(relativeTime(2 * 3600 * 1000)).toBe('2 hours ago'));
  test('23 hours 59 min',  () => expect(relativeTime((23 * 3600 + 59 * 60) * 1000)).toBe('23 hours 59 min ago'));

  test('1 day exactly',    () => expect(relativeTime(86400 * 1000)).toBe('1 day ago'));
  test('1 day 12 hr',      () => expect(relativeTime((86400 + 43200) * 1000)).toBe('1 day 12 hr ago'));
  test('3 days',           () => expect(relativeTime(3 * 86400 * 1000)).toBe('3 days ago'));
  test('30 days',          () => expect(relativeTime(30 * 86400 * 1000)).toBe('30 days ago'));
});

describe('relativeTime — future (negative diffMs)', () => {
  test('In 1 second',   () => expect(relativeTime(-1000)).toBe('In 1 second'));
  test('In 30 seconds', () => expect(relativeTime(-30 * 1000)).toBe('In 30 seconds'));
  test('In 5 minutes',  () => expect(relativeTime(-5 * 60 * 1000)).toBe('In 5 minutes'));
  test('In 2 hours',    () => expect(relativeTime(-2 * 3600 * 1000)).toBe('In 2 hours'));
  test('In 1 day',      () => expect(relativeTime(-86400 * 1000)).toBe('In 1 day'));
  test('In 7 days',     () => expect(relativeTime(-7 * 86400 * 1000)).toBe('In 7 days'));
});
