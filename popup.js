document.addEventListener('DOMContentLoaded', function () {

  // Selection toggle — persist state via chrome.storage
  var toggle = document.getElementById('selection-toggle');
  chrome.storage.sync.get('selectionEnabled', function (data) {
    toggle.checked = !!data.selectionEnabled;
  });
  toggle.addEventListener('change', function () {
    chrome.storage.sync.set({ selectionEnabled: toggle.checked });
  });

  // Tab switching
  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      switchTab(tab.dataset.tab);
    });
  });

  // Now buttons
  document.getElementById('now-ist').addEventListener('click', function () { setNow('ist'); });
  document.getElementById('now-gmt').addEventListener('click', function () { setNow('gmt'); });

  // Convert buttons
  document.getElementById('convert-ist').addEventListener('click', function () { convertToEpoch('ist'); });
  document.getElementById('convert-gmt').addEventListener('click', function () { convertToEpoch('gmt'); });
  document.getElementById('convert-epoch').addEventListener('click', convertFromEpoch);

  // Copy buttons are dynamically added, so use event delegation on result boxes
  document.getElementById('ist-result').addEventListener('click', handleCopy);
  document.getElementById('gmt-result').addEventListener('click', handleCopy);
  document.getElementById('epoch-result').addEventListener('click', handleCopy);
});

function switchTab(name) {
  ['ist', 'gmt', 'epoch'].forEach(function (t) {
    document.getElementById('tab-' + t).classList.toggle('active', t === name);
    document.getElementById('section-' + t).classList.toggle('active', t === name);
  });
}

function setNow(zone) {
  var now = new Date();
  if (zone === 'ist') {
    var ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    document.getElementById('ist-date').value = ist.toISOString().slice(0, 10);
    document.getElementById('ist-time').value = ist.toISOString().slice(11, 19);
  } else {
    document.getElementById('gmt-date').value = now.toISOString().slice(0, 10);
    document.getElementById('gmt-time').value = now.toISOString().slice(11, 19);
  }
}

function convertToEpoch(zone) {
  var dateVal = document.getElementById(zone + '-date').value;
  var timeVal = document.getElementById(zone + '-time').value || '00:00:00';
  var errorEl = document.getElementById(zone + '-error');
  var resultEl = document.getElementById(zone + '-result');

  errorEl.textContent = '';
  resultEl.style.display = 'none';

  if (!dateVal) {
    errorEl.textContent = 'Please enter a date.';
    return;
  }

  var isoStr = zone === 'ist'
    ? dateVal + 'T' + timeVal + '+05:30'
    : dateVal + 'T' + timeVal + 'Z';

  var epochMs = new Date(isoStr).getTime();

  if (isNaN(epochMs)) {
    errorEl.textContent = 'Invalid date or time.';
    return;
  }

  var epochSec = Math.floor(epochMs / 1000);
  var istStr = new Date(epochMs + (5.5 * 60 * 60 * 1000)).toISOString().replace('T', ' ').slice(0, 19) + ' IST';
  var gmtStr = new Date(epochMs).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  resultEl.innerHTML =
    '<div class="result-label">Epoch (seconds)</div>' +
    '<div class="epoch-value" id="' + zone + '-epoch-sec">' + epochSec + '</div>' +
    '<button class="copy-btn" data-target="' + zone + '-epoch-sec">Copy</button>' +
    '<hr>' +
    '<div class="result-label" style="margin-top:10px">Epoch (milliseconds)</div>' +
    '<div class="epoch-value" id="' + zone + '-epoch-ms">' + epochMs + '</div>' +
    '<button class="copy-btn" data-target="' + zone + '-epoch-ms">Copy</button>' +
    '<hr>' +
    '<div style="margin-top:10px; font-size:12px; color:#888;">' +
      '<div style="margin-bottom:4px">IST: <span style="color:#d1d5db">' + istStr + '</span></div>' +
      '<div>UTC: <span style="color:#d1d5db">' + gmtStr + '</span></div>' +
    '</div>';

  resultEl.style.display = 'block';
}

function convertFromEpoch() {
  var input = document.getElementById('epoch-input').value.trim();
  var errorEl = document.getElementById('epoch-error');
  var resultEl = document.getElementById('epoch-result');

  errorEl.textContent = '';
  resultEl.style.display = 'none';

  if (!input || !/^\d+$/.test(input)) {
    errorEl.textContent = 'Please enter a valid numeric epoch value.';
    return;
  }

  var epochMs = parseInt(input, 10);
  if (input.length === 10) {
    epochMs = epochMs * 1000;
  }

  var d = new Date(epochMs);
  if (isNaN(d.getTime())) {
    errorEl.textContent = 'Invalid epoch value.';
    return;
  }

  var epochSec = Math.floor(epochMs / 1000);
  var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var istDate = new Date(epochMs + (5.5 * 60 * 60 * 1000));
  var istStr = istDate.toISOString().replace('T', ' ').slice(0, 19) + ' IST';
  var gmtStr = d.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  var dayUTC = days[d.getUTCDay()];
  var dayIST = days[istDate.getUTCDay()];

  resultEl.innerHTML =
    '<div class="result-label">IST (UTC+5:30)</div>' +
    '<div style="font-size:16px; font-weight:600; color:#e0e0e0" id="from-ist">' + istStr + '</div>' +
    '<div style="font-size:11px; color:#666; margin-bottom:4px">' + dayIST + '</div>' +
    '<button class="copy-btn" data-target="from-ist">Copy</button>' +
    '<hr>' +
    '<div class="result-label" style="margin-top:10px">GMT / UTC</div>' +
    '<div style="font-size:16px; font-weight:600; color:#e0e0e0" id="from-gmt">' + gmtStr + '</div>' +
    '<div style="font-size:11px; color:#666; margin-bottom:4px">' + dayUTC + '</div>' +
    '<button class="copy-btn" data-target="from-gmt">Copy</button>' +
    '<hr>' +
    '<div style="margin-top:10px; font-size:12px; color:#888;">' +
      'Epoch (s): <span style="color:#60a5fa">' + epochSec + '</span> &nbsp;|&nbsp; ' +
      'Epoch (ms): <span style="color:#60a5fa">' + epochMs + '</span>' +
    '</div>';

  resultEl.style.display = 'block';
}

function handleCopy(e) {
  var btn = e.target.closest('.copy-btn');
  if (!btn) return;
  var targetId = btn.dataset.target;
  var el = document.getElementById(targetId);
  if (!el) return;
  navigator.clipboard.writeText(el.textContent.trim()).then(function () {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(function () {
      btn.textContent = 'Copy';
      btn.classList.remove('copied');
    }, 1500);
  });
}
