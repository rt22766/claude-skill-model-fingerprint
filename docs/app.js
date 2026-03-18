/**
 * app.js - UI interaction logic
 * No detection rules here — all analysis delegated to analyzer.js
 */
;(function () {
  'use strict';

  var testResults = {};
  var TEST_NAMES = {
    1: 'Reasoning Effort 指纹',
    2: '身份自我认知',
    3: 'Magic String 拒绝',
    4: '综合知识压力测试',
    5: '特定场景压力测试',
    6: 'Constitutional AI 知识'
  };

  // --- Card toggle ---
  window.toggleCard = function (header) {
    var card = header.parentElement;
    card.classList.toggle('open');
  };

  // --- Copy prompt ---
  window.copyPrompt = function (id, btn) {
    var el = document.getElementById(id);
    var text = el.textContent || el.innerText;
    navigator.clipboard.writeText(text).then(function () {
      btn.textContent = '\u5df2\u590d\u5236 \u2713';
      setTimeout(function () { btn.textContent = '\u590d\u5236 Prompt'; }, 2000);
    });
  };

  // --- Render helpers ---
  function renderSignals(signals) {
    return signals.map(function (s) {
      return '<div class="result-item ' + s.s + '">' + s.t + '</div>';
    }).join('');
  }

  function renderSimple(status, text) {
    return '<div class="result-item ' + status + '">' + text + '</div>';
  }

  function setBadge(num, status) {
    var badge = document.getElementById('badge-' + num);
    badge.className = 'badge ' + status;
    if (status === 'pass') badge.textContent = '\u2705 \u901a\u8fc7';
    else if (status === 'warn') badge.textContent = '\u26a0\ufe0f \u5f85\u5b9a';
    else badge.textContent = '\u274c \u5f02\u5e38';
  }

  // --- Run tests ---
  window.runTest = function (num) {
    var text = document.getElementById('response-' + num).value.trim();
    var el = document.getElementById('result-' + num);

    if (!text) {
      el.innerHTML = renderSimple('warn', '\u8bf7\u5148\u7c98\u8d34 Claude \u7684\u56de\u590d');
      return;
    }

    var r;
    switch (num) {
      case 1:
        r = window._FP.analyzeRE(text);
        el.innerHTML = renderSimple(r.status, r.details);
        break;
      case 2:
        r = window._FP.analyzeID(text);
        el.innerHTML = renderSignals(r.signals);
        break;
      case 3:
        r = window._FP.analyzeMagic(text);
        el.innerHTML = renderSimple(r.status, r.details);
        break;
      case 4:
        r = window._FP.analyzeKnowledge(text);
        el.innerHTML = renderSignals(r.signals);
        break;
      case 5:
        r = window._FP.analyzeStory(text);
        el.innerHTML = renderSignals(r.signals);
        break;
      case 6:
        r = window._FP.analyzeCAI(text);
        el.innerHTML = renderSignals(r.signals);
        break;
    }

    testResults[num] = r.status;
    setBadge(num, r.status);
  };

  // --- Generate report ---
  window.generateReport = function () {
    var el = document.getElementById('final-report');
    var completed = Object.keys(testResults).length;

    if (completed === 0) {
      el.innerHTML = '<div class="report-box"><p style="text-align:center;color:var(--yellow);">\u8bf7\u5148\u5b8c\u6210\u81f3\u5c11\u4e00\u9879\u6d4b\u8bd5</p></div>';
      return;
    }

    var statuses = {};
    for (var k in testResults) { statuses[k] = testResults[k]; }
    var v = window._FP.verdict(statuses);

    var html = '<div class="report-box">';
    html += '<h2>\u6a21\u578b\u6307\u7eb9\u68c0\u6d4b\u62a5\u544a</h2>';

    // Verdict
    html += '<div class="report-verdict ' + v.level + '">' + v.text + '</div>';

    // Score bar
    html += '<div class="score-bar">';
    for (var i = 1; i <= 6; i++) {
      var s = testResults[i] || 'none';
      var cls = s === 'none' ? '' : s;
      html += '<div class="score-dot ' + cls + '" title="' + TEST_NAMES[i] + '"></div>';
    }
    html += '</div>';

    // Details
    html += '<h3>\u68c0\u6d4b\u8be6\u60c5</h3>';
    for (var j = 1; j <= 6; j++) {
      var st = testResults[j];
      var icon = st === 'pass' ? '\u2705' : (st === 'warn' ? '\u26a0\ufe0f' : (st === 'fail' ? '\u274c' : '\u2b1c'));
      html += '<div class="report-detail-item">';
      html += '<span>' + TEST_NAMES[j] + '</span>';
      html += '<span>' + icon + ' ' + (st || '\u672a\u6d4b\u8bd5') + '</span>';
      html += '</div>';
    }

    html += '<h3>\u7edf\u8ba1</h3>';
    html += '<div class="report-detail-item"><span>\u5df2\u5b8c\u6210\u6d4b\u8bd5</span><span>' + completed + ' / 6</span></div>';
    html += '<div class="report-detail-item"><span>\u53ef\u4fe1\u5ea6</span><span>' + v.conf + '</span></div>';

    html += '<p style="margin-top:16px;color:var(--text-muted);font-size:0.78rem;">';
    html += '\u2139\ufe0f \u672c\u62a5\u544a\u57fa\u4e8e\u7ecf\u9a8c\u6027\u542f\u53d1\u5f0f\u68c0\u6d4b\uff0c\u4e0d\u4ee3\u8868 Anthropic \u5b98\u65b9\u8ba4\u8bc1\u3002';
    html += '</p>';

    html += '</div>';
    el.innerHTML = html;

    // Scroll to report
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
})();
