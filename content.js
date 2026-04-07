(function () {
  var tooltip = null;

  // Epoch: 10-digit (seconds) or 13-digit (milliseconds)
  var EPOCH_RE = /^\d{10}(\d{3})?$/;

  var MONTHS = {
    january:1, february:2, march:3, april:4, may:5, june:6,
    july:7, august:8, september:9, october:10, november:11, december:12,
    jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12
  };
  var MONTH_PATTERN = 'January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec';

  document.addEventListener('mouseup', function (e) {
    setTimeout(function () { handleSelection(e); }, 50);
  });

  document.addEventListener('mousedown', function (e) {
    if (tooltip && !tooltip.contains(e.target)) removeTooltip();
  });

  function handleSelection(e) {
    try {
      chrome.storage.sync.get('selectionEnabled', function (data) {
        if (chrome.runtime.lastError) return; // context gone
        if (!data.selectionEnabled) return;

      var sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      var raw = sel.toString().trim();
      if (!raw) return;

      // 1. Plain epoch number
      if (EPOCH_RE.test(raw)) {
        var epochMs = raw.length === 13 ? parseInt(raw, 10) : parseInt(raw, 10) * 1000;
        if (!isNaN(new Date(epochMs).getTime())) {
          showTooltip(e.clientX, e.clientY, epochMs);
        }
        return;
      }

      // 2. Try structured datetime parser for human-readable formats
      var epochMs2 = parseHumanDatetime(raw);
      if (epochMs2 !== null) {
        showTooltip(e.clientX, e.clientY, epochMs2);
      }
      });
    } catch (err) {
      // Extension context invalidated (e.g. after reload) — stop silently
    }
  }

  // ─── Human-readable datetime parser ────────────────────────────────────────

  function parseHumanDatetime(raw) {
    // Step 1: normalise the raw string
    var text = raw
      // Expand known timezone names to short codes before stripping words
      .replace(/Indian\s+Standard\s+Time/gi, 'IST')
      .replace(/\(IST\)/gi, 'IST')
      .replace(/\(UTC\)/gi, 'UTC')
      .replace(/\(GMT\)/gi, 'GMT')
      // Remove filler phrases like "UTC current time is", "current date is"
      .replace(/\b(UTC|GMT)?\s*current\s+(time|date)\s+is\b/gi, '')
      // Remove day names
      .replace(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/gi, '')
      // Remove ordinal suffixes: 7th → 7, 1st → 1
      .replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, '$1')
      // Remove stray punctuation (commas, periods, colons as separators)
      .replace(/[,\.]+/g, ' ')
      // Collapse newlines and tabs into spaces
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Step 2: detect timezone
    var tz = 'UTC'; // default
    if (/\bIST\b/i.test(text)) tz = 'IST';
    else if (/\b(UTC|GMT)\b/i.test(text)) tz = 'UTC';

    // Step 3: extract time
    // Try 12-hour (e.g. "2:38 pm", "02:38:00 am")
    var t12 = text.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)\b/i);
    // Try 24-hour (e.g. "09:08:31")
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
      return null; // no time found
    }

    // Step 4: extract date
    var year, month, day;
    var mPat = '(' + MONTH_PATTERN + ')';

    // ISO: 2024-04-07
    var iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    // "7 April 2026" or "7 Apr 2026"
    var dmy = text.match(new RegExp('\\b(\\d{1,2})\\s+' + mPat + '\\s+(\\d{4})\\b', 'i'));
    // "April 7 2026"
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
      return null; // no date found
    }

    if (!month || month < 1 || month > 12) return null;

    // Step 5: build ISO string with correct offset and parse
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

  // ─── Tooltip ────────────────────────────────────────────────────────────────

  function showTooltip(cx, cy, epochMs) {
    removeTooltip();

    var d = new Date(epochMs);
    var epochSec = Math.floor(epochMs / 1000);
    var istDate = new Date(epochMs + 5.5 * 60 * 60 * 1000);
    var istStr = istDate.toISOString().replace('T', ' ').slice(0, 19) + ' IST';
    var gmtStr = d.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    var relStr = relativeTime(Date.now() - epochMs);

    var btn = 'padding:3px 10px;background:#262626;border:1px solid #333;border-radius:4px;' +
              'color:#aaa;font-size:11px;cursor:pointer;flex-shrink:0;margin-left:8px';

    tooltip = document.createElement('div');
    tooltip.id = '__epoch_tooltip__';
    tooltip.innerHTML =
      '<div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px">Epoch Converter</div>' +

      row('IST', istStr, '__ec_ist__', btn) +
      row('UTC', gmtStr, '__ec_utc__', btn) +

      '<div style="border-top:1px solid #2a2a2a;padding-top:8px;display:flex;align-items:center;justify-content:space-between">' +
        '<div>' +
          '<div style="font-size:12px;color:#60a5fa;margin-bottom:2px">' + relStr + '</div>' +
          '<div style="font-size:11px;color:#555">Epoch: <span style="color:#888">' + epochSec + '</span></div>' +
        '</div>' +
        '<button id="__ec_epoch__" style="' + btn + '">Copy Epoch</button>' +
      '</div>';

    Object.assign(tooltip.style, {
      position: 'fixed',
      zIndex: '2147483647',
      background: '#1a1a1a',
      border: '1px solid #2a2a2a',
      borderRadius: '8px',
      padding: '12px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,.6)',
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      minWidth: '280px',
      maxWidth: '340px',
      lineHeight: '1.4',
      userSelect: 'none'
    });

    document.body.appendChild(tooltip);

    // Position — flip if it would overflow viewport
    var tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
    var left = cx + 12, top = cy + 12;
    if (left + tw > window.innerWidth  - 8) left = cx - tw - 12;
    if (top  + th > window.innerHeight - 8) top  = cy - th - 12;
    tooltip.style.left = left + 'px';
    tooltip.style.top  = top  + 'px';

    bindCopy('__ec_ist__',   istStr);
    bindCopy('__ec_utc__',   gmtStr);
    bindCopy('__ec_epoch__', String(epochSec));
  }

  function row(label, value, id, btnStyle) {
    return '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">' +
      '<div>' +
        '<span style="color:#555;font-size:11px">' + label + '&nbsp;</span>' +
        '<span style="color:#e0e0e0;font-size:13px;font-weight:600">' + value + '</span>' +
      '</div>' +
      '<button id="' + id + '" style="' + btnStyle + '">Copy ' + label + '</button>' +
    '</div>';
  }

  function bindCopy(id, value) {
    var btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', function () {
      navigator.clipboard.writeText(value).then(function () {
        var orig = btn.textContent;
        btn.textContent = 'Copied!';
        btn.style.color = '#4ade80';
        btn.style.borderColor = '#4ade80';
        setTimeout(function () {
          btn.textContent = orig;
          btn.style.color = '#aaa';
          btn.style.borderColor = '#333';
        }, 1500);
      });
    });
  }

  function removeTooltip() {
    if (tooltip) { tooltip.remove(); tooltip = null; }
  }

  // ─── Relative time ──────────────────────────────────────────────────────────

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
})();
