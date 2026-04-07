/**
 * Pure functions extracted from content.js and popup.js for unit testing.
 * The extension files themselves can't be imported directly (Chrome APIs + IIFE).
 */

// ─── Shared constants ────────────────────────────────────────────────────────

var EPOCH_RE = /^\d{10}(\d{3})?$/;

var MONTHS = {
  january:1, february:2, march:3, april:4, may:5, june:6,
  july:7, august:8, september:9, october:10, november:11, december:12,
  jan:1, feb:2, mar:3, apr:4, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12
};

var MONTH_PATTERN = 'January|February|March|April|May|June|July|August|September|' +
  'October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec';

// ─── content.js: parseHumanDatetime ─────────────────────────────────────────

function parseHumanDatetime(raw) {
  var text = raw
    .replace(/Indian\s+Standard\s+Time/gi, 'IST')
    .replace(/\(IST\)/gi, 'IST')
    .replace(/\(UTC\)/gi, 'UTC')
    .replace(/\(GMT\)/gi, 'GMT')
    .replace(/\b(UTC|GMT)?\s*current\s+(time|date)\s+is\b/gi, '')
    .replace(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi, '')
    .replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, '$1')
    .replace(/[,\.]+/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  var tz = 'UTC';
  if (/\bIST\b/i.test(text)) tz = 'IST';
  else if (/\b(UTC|GMT)\b/i.test(text)) tz = 'UTC';

  var t12 = text.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)\b/i);
  var t24 = text.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);

  var hours, minutes, seconds;
  if (t12) {
    hours   = parseInt(t12[1], 10);
    minutes = parseInt(t12[2], 10);
    seconds = t12[3] ? parseInt(t12[3], 10) : 0;
    var ampm = t12[4].toLowerCase();
    if (ampm === 'pm' && hours !== 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
  } else if (t24) {
    hours   = parseInt(t24[1], 10);
    minutes = parseInt(t24[2], 10);
    seconds = t24[3] ? parseInt(t24[3], 10) : 0;
  } else {
    return null;
  }

  var year, month, day;
  var mPat = '(' + MONTH_PATTERN + ')';
  var iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  var dmy = text.match(new RegExp('\\b(\\d{1,2})\\s+' + mPat + '\\s+(\\d{4})\\b', 'i'));
  var mdy = text.match(new RegExp('\\b' + mPat + '\\s+(\\d{1,2})\\s+(\\d{4})\\b', 'i'));

  if (iso) {
    year  = parseInt(iso[1], 10);
    month = parseInt(iso[2], 10);
    day   = parseInt(iso[3], 10);
  } else if (dmy) {
    day   = parseInt(dmy[1], 10);
    month = MONTHS[dmy[2].toLowerCase()];
    year  = parseInt(dmy[3], 10);
  } else if (mdy) {
    month = MONTHS[mdy[1].toLowerCase()];
    day   = parseInt(mdy[2], 10);
    year  = parseInt(mdy[3], 10);
  } else {
    return null;
  }

  if (!month || month < 1 || month > 12) return null;

  var mm  = String(month).padStart(2, '0');
  var dd  = String(day).padStart(2, '0');
  var hh  = String(hours).padStart(2, '0');
  var min = String(minutes).padStart(2, '0');
  var ss  = String(seconds).padStart(2, '0');

  var isoStr = year + '-' + mm + '-' + dd + 'T' + hh + ':' + min + ':' + ss +
    (tz === 'IST' ? '+05:30' : 'Z');

  var ts = new Date(isoStr).getTime();
  return isNaN(ts) ? null : ts;
}

// ─── content.js: relativeTime ────────────────────────────────────────────────

function relativeTime(diffMs) {
  var future = diffMs < 0;
  var abs = Math.abs(diffMs);
  var sec = Math.floor(abs / 1000);
  var min = Math.floor(sec / 60);
  var hr  = Math.floor(min / 60);
  var day = Math.floor(hr / 24);

  var str;
  if (sec < 60) {
    str = sec + ' second' + (sec !== 1 ? 's' : '');
  } else if (min < 60) {
    str = min + ' minute' + (min !== 1 ? 's' : '');
    var rs = sec % 60; if (rs) str += ' ' + rs + 's';
  } else if (hr < 24) {
    str = hr + ' hour' + (hr !== 1 ? 's' : '');
    var rm = min % 60; if (rm) str += ' ' + rm + ' min';
  } else {
    str = day + ' day' + (day !== 1 ? 's' : '');
    var rh = hr % 24; if (rh) str += ' ' + rh + ' hr';
  }

  return future ? 'In ' + str : str + ' ago';
}

// ─── popup.js: toEpoch ───────────────────────────────────────────────────────

/**
 * Convert a date + time string to epoch ms.
 * zone: 'ist' | 'gmt'
 * Returns { epochMs, epochSec, istStr, gmtStr } or null on invalid input.
 */
function toEpoch(dateVal, timeVal, zone) {
  if (!dateVal) return null;
  var t = timeVal || '00:00:00';
  var isoStr = zone === 'ist'
    ? dateVal + 'T' + t + '+05:30'
    : dateVal + 'T' + t + 'Z';

  var epochMs = new Date(isoStr).getTime();
  if (isNaN(epochMs)) return null;

  var epochSec = Math.floor(epochMs / 1000);
  var istStr = new Date(epochMs + 5.5 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19) + ' IST';
  var gmtStr = new Date(epochMs).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  return { epochMs, epochSec, istStr, gmtStr };
}

// ─── popup.js: fromEpoch ─────────────────────────────────────────────────────

/**
 * Convert an epoch string (seconds or ms) to IST + UTC strings.
 * Returns { epochMs, epochSec, istStr, gmtStr, dayIST, dayUTC } or null on invalid input.
 */
function fromEpoch(input) {
  if (!input || !/^\d+$/.test(input)) return null;
  var epochMs = parseInt(input, 10);
  if (input.length <= 10) epochMs *= 1000;

  var d = new Date(epochMs);
  if (isNaN(d.getTime())) return null;

  var epochSec = Math.floor(epochMs / 1000);
  var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var istDate = new Date(epochMs + 5.5 * 60 * 60 * 1000);
  var istStr = istDate.toISOString().replace('T', ' ').slice(0, 19) + ' IST';
  var gmtStr = d.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  return {
    epochMs,
    epochSec,
    istStr,
    gmtStr,
    dayIST: days[istDate.getUTCDay()],
    dayUTC: days[d.getUTCDay()]
  };
}

// ─── content.js: isEpoch ─────────────────────────────────────────────────────

function isEpoch(text) {
  return EPOCH_RE.test(text.trim());
}

module.exports = { parseHumanDatetime, relativeTime, toEpoch, fromEpoch, isEpoch };
