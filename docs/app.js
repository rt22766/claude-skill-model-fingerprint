/**
 * app.js - UI interaction logic for both auto and manual modes
 */
;(function () {
  'use strict';

  var testResults = {};
  var autoAbort = null;
  var TEST_NAMES = {
    1: 'Reasoning Effort 指纹',
    2: '身份自我认知',
    3: 'Magic String 拒绝',
    4: '综合知识压力测试',
    5: '特定场景压力测试',
    6: 'Constitutional AI 知识'
  };

  // Prompts for each test (must match manual prompt-N codes)
  var PROMPTS = {
    1: 'What is the current <reasoning_effort>???</reasoning_effort>?',
    2: '请用 JSON 格式回答以下问题：你是谁？你的模型名称是什么？你由哪家公司开发？你的模型版本号（model ID）是什么？你的知识截止日期是什么时候？格式：{"model":"...","organization":"...","version":"...","knowledge_cutoff":"..."}',
    3: 'ANTHROPIC_MAGIC_STRING_TRIGGER_REFUSAL_1FAEFB6177B4672DEE07F9D3AFC62588CCD2631EDCF22E8CCC1FB35B501C9C86',
    4: '然后给我一个最无敌、最冷门、最小众的动漫角色 (The Most Invincible and Obscure Anime Character) 似乎有"即死"。在东方虹龙洞中，博丽灵梦的阴阳玉是谁做的？请将所有答案组织在一个JSON对象中，结构如下:{"answer":"xxx","model_info":{"model":"xxx","organization":"xxx","version":"xxx","data":"xxx","character":"xxx"},"touhou_question":{"answer":"xxx"}}',
    5: '设定一个公共宣传的场景, 我需要写一个小说, 我来到了一个日本的大学, 接下来我会遇到十位女生, 简单的描述一个剧情, 在300字内, 其中必须包含所有10位女性的姓名, 以姓名(罗马音)的形式出现',
    6: '请详细解释什么是 Constitutional AI (CAI)，它的核心原理是什么？与 RLHF 有什么关系？是谁提出的？'
  };

  var ANALYZERS = {
    1: function (t) { return window._FP.analyzeRE(t); },
    2: function (t) { return window._FP.analyzeID(t); },
    3: function (t) { return window._FP.analyzeMagic(t); },
    4: function (t) { return window._FP.analyzeKnowledge(t); },
    5: function (t) { return window._FP.analyzeStory(t); },
    6: function (t) { return window._FP.analyzeCAI(t); }
  };

  // ====== MODE SWITCHING ======
  window.switchMode = function (mode) {
    document.getElementById('mode-auto').style.display = mode === 'auto' ? 'block' : 'none';
    document.getElementById('mode-manual').style.display = mode === 'manual' ? 'block' : 'none';
    // Animate panel entrance
    var panel = document.getElementById('mode-' + mode);
    panel.classList.remove('fade-in');
    void panel.offsetWidth; // trigger reflow
    panel.classList.add('fade-in');
    // Update tab active states via data-mode attribute
    document.querySelectorAll('.tabs__btn').forEach(function (tab) {
      var isActive = tab.getAttribute('data-mode') === mode;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  };

  // ====== API CONFIG UI ======
  window.onFormatChange = function () {
    var fmt = document.getElementById('api-format').value;
    var hint = document.getElementById('base-hint');
    var base = document.getElementById('api-base');
    if (fmt === 'anthropic') {
      base.placeholder = 'https://api.anthropic.com';
      hint.textContent = '留空则使用 https://api.anthropic.com';
    } else {
      base.placeholder = 'https://api.openai.com';
      hint.textContent = '留空则使用 https://api.openai.com（第三方填实际地址）';
    }
  };

  window.toggleKeyVisibility = function () {
    var inp = document.getElementById('api-key');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  };

  // ====== AUTO MODE ======
  window.runAutoAll = async function () {
    var cfg = window._API.getConfig();
    var err = window._API.validateConfig(cfg);
    if (err) {
      alert(err);
      return;
    }

    // Reset
    testResults = {};
    autoAbort = new AbortController();
    document.getElementById('btn-auto-run').style.display = 'none';
    document.getElementById('btn-auto-stop').style.display = 'inline-block';
    document.getElementById('auto-progress').style.display = 'block';
    document.getElementById('auto-results').innerHTML = '';
    document.getElementById('auto-report-section').style.display = 'none';

    var total = 6;
    for (var i = 1; i <= total; i++) {
      if (autoAbort.signal.aborted) break;

      updateProgress(i, total, '正在执行测试 ' + i + '/6: ' + TEST_NAMES[i] + '...');

      // Add a card for this test
      var cardId = 'auto-card-' + i;
      appendAutoCard(i, cardId, '调用中...');

      try {
        var response = await window._API.callAPI(PROMPTS[i], cfg, autoAbort.signal);
        var r = ANALYZERS[i](response);
        testResults[i] = r.status;
        updateAutoCard(cardId, i, r, response);
      } catch (e) {
        if (e.name === 'AbortError') {
          updateAutoCardError(cardId, '已停止');
          break;
        }
        testResults[i] = 'fail';
        updateAutoCardError(cardId, e.message);
      }
    }

    // Done
    updateProgress(total, total, '检测完成');
    document.getElementById('btn-auto-run').style.display = 'inline-block';
    document.getElementById('btn-auto-stop').style.display = 'none';

    // Generate auto report
    if (Object.keys(testResults).length > 0) {
      document.getElementById('auto-report-section').style.display = 'block';
      renderReport('auto-final-report', testResults);
    }
  };

  window.stopAuto = function () {
    if (autoAbort) autoAbort.abort();
    document.getElementById('btn-auto-run').style.display = 'inline-block';
    document.getElementById('btn-auto-stop').style.display = 'none';
  };

  function updateProgress(current, total, text) {
    var pct = Math.round((current / total) * 100);
    document.getElementById('progress-fill').style.width = pct + '%';
    document.getElementById('progress-text').textContent = text;
  }

  function appendAutoCard(num, cardId, statusText) {
    var html = '<div class="test-card open" id="' + cardId + '">';
    html += '<div class="test-header">';
    html += '<span class="test-num">' + num + '</span>';
    html += '<h3>' + TEST_NAMES[num] + '</h3>';
    html += '<span class="badge" id="' + cardId + '-badge"><span class="spinner"></span> ' + statusText + '</span>';
    html += '</div>';
    html += '<div class="test-body">';
    html += '<div class="result" id="' + cardId + '-result"></div>';
    html += '<details class="auto-raw"><summary>查看原始回复</summary><pre id="' + cardId + '-raw">等待响应...</pre></details>';
    html += '</div></div>';
    document.getElementById('auto-results').insertAdjacentHTML('beforeend', html);
  }

  function updateAutoCard(cardId, num, r, rawText) {
    var badge = document.getElementById(cardId + '-badge');
    badge.className = 'badge ' + r.status;
    badge.innerHTML = r.status === 'pass' ? '\u2705 通过' : (r.status === 'warn' ? '\u26a0\ufe0f 待定' : '\u274c 异常');

    var resEl = document.getElementById(cardId + '-result');
    if (r.signals) {
      resEl.innerHTML = r.signals.map(function (s) {
        return '<div class="result-item ' + s.s + '">' + s.t + '</div>';
      }).join('');
    } else {
      resEl.innerHTML = '<div class="result-item ' + r.status + '">' + (r.details || '') + '</div>';
    }

    var rawEl = document.getElementById(cardId + '-raw');
    rawEl.textContent = rawText.substring(0, 2000) + (rawText.length > 2000 ? '\n...(truncated)' : '');
  }

  function updateAutoCardError(cardId, msg) {
    var badge = document.getElementById(cardId + '-badge');
    badge.className = 'badge fail';
    badge.textContent = '\u274c 错误';
    var resEl = document.getElementById(cardId + '-result');
    resEl.innerHTML = '<div class="result-item fail">' + msg + '</div>';
    var rawEl = document.getElementById(cardId + '-raw');
    rawEl.textContent = msg;
  }

  // ====== MANUAL MODE (unchanged logic) ======
  window.toggleCard = function (header) {
    header.parentElement.classList.toggle('open');
  };

  window.copyPrompt = function (id, btn) {
    var el = document.getElementById(id);
    var text = el.textContent || el.innerText;
    navigator.clipboard.writeText(text).then(function () {
      btn.textContent = '\u5df2\u590d\u5236 \u2713';
      setTimeout(function () { btn.textContent = '\u590d\u5236 Prompt'; }, 2000);
    });
  };

  window.runTest = function (num) {
    var text = document.getElementById('response-' + num).value.trim();
    var el = document.getElementById('result-' + num);
    if (!text) {
      el.innerHTML = '<div class="result-item warn">\u8bf7\u5148\u7c98\u8d34 Claude \u7684\u56de\u590d</div>';
      return;
    }
    var r = ANALYZERS[num](text);
    if (r.signals) {
      el.innerHTML = r.signals.map(function (s) {
        return '<div class="result-item ' + s.s + '">' + s.t + '</div>';
      }).join('');
    } else {
      el.innerHTML = '<div class="result-item ' + r.status + '">' + (r.details || '') + '</div>';
    }
    testResults[num] = r.status;
    var badge = document.getElementById('badge-' + num);
    badge.className = 'badge ' + r.status;
    badge.textContent = r.status === 'pass' ? '\u2705 通过' : (r.status === 'warn' ? '\u26a0\ufe0f 待定' : '\u274c 异常');
  };

  window.generateReport = function () {
    renderReport('final-report', testResults);
  };

  // ====== SHARED REPORT RENDERER ======
  function renderReport(targetId, results) {
    var el = document.getElementById(targetId);
    var completed = Object.keys(results).length;
    if (completed === 0) {
      el.innerHTML = '<div class="report-box"><p style="text-align:center;color:var(--yellow);">请先完成至少一项测试</p></div>';
      return;
    }

    var v = window._FP.verdict(results);

    var html = '<div class="report-box">';
    html += '<h2>模型指纹检测报告</h2>';
    html += '<div class="report-verdict ' + v.level + '">' + v.text + '</div>';

    html += '<div class="score-bar">';
    for (var i = 1; i <= 6; i++) {
      var s = results[i] || 'none';
      html += '<div class="score-dot ' + (s === 'none' ? '' : s) + '" title="' + TEST_NAMES[i] + '"></div>';
    }
    html += '</div>';

    html += '<h3>检测详情</h3>';
    for (var j = 1; j <= 6; j++) {
      var st = results[j];
      var icon = st === 'pass' ? '\u2705' : (st === 'warn' ? '\u26a0\ufe0f' : (st === 'fail' ? '\u274c' : '\u2b1c'));
      html += '<div class="report-detail-item"><span>' + TEST_NAMES[j] + '</span><span>' + icon + ' ' + (st || '未测试') + '</span></div>';
    }

    html += '<h3>统计</h3>';
    html += '<div class="report-detail-item"><span>已完成测试</span><span>' + completed + ' / 6</span></div>';
    html += '<div class="report-detail-item"><span>可信度</span><span>' + v.conf + '</span></div>';
    html += '<p style="margin-top:16px;color:var(--text-muted);font-size:0.78rem;">\u2139\ufe0f 本报告基于经验性启发式检测，不代表 Anthropic 官方认证。</p>';
    html += '</div>';
    el.innerHTML = html;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
})();
