/**
 * analyzer.js - Core analysis engine
 * Detection rules are encoded to prevent direct inspection.
 * This file handles pattern matching and scoring — no raw rules exposed.
 */
;(function () {
  'use strict';

  // --- Encoding helpers (keep rules out of plain sight) ---
  var _h = function (s) { return atob(s); };
  var _l = function (t) { return t.toLowerCase(); };

  // Pre-encoded keyword sets (base64)
  var _ID_POS = [
    'Y2xhdWRl',       // claude
    'YW50aHJvcGlj',   // anthropic
    'b3B1cw==',       // opus
    'c29ubmV0',       // sonnet
    'NC42',           // 4.6
    'MjAyNQ==',       // 2025
  ];
  var _ID_NEG = [
    'Z3B0',           // gpt
    'b3BlbmFp',       // openai
    'Z2VtaW5p',       // gemini
    'Z29vZ2xl',       // google
    'bGxhbWE=',       // llama
    'bWV0YQ==',       // meta
    'bWlzdHJhbA==',   // mistral
  ];
  var _REFUSAL = [
    'c29ycnk=',       // sorry
    'Y2Fubm90',       // cannot
    'Y2FuJ3Q=',       // can't
    'dW5hYmxl',       // unable
    'cmVmdXNl',       // refuse
    '5oq55q2J',       // 抱歉
    '5peg5rOV',       // 无法
    '5ouS57ud',       // 拒绝
    'ZGVjbGluZQ==',   // decline
    'bm90IGFibGU=',   // not able
    'c2FmZXR5',       // safety
  ];
  var _CAI = [
    'Y29uc3RpdHV0aW9uYWw=',   // constitutional
    'cmxhaWY=',                 // rlaif
    'cmxoZg==',                 // rlhf
    'YW50aHJvcGlj',             // anthropic
    'YWxpZ25tZW50',             // alignment
    'cHJpbmNpcGxl',             // principle
    'c2VsZi1pbXByb3Zl',         // self-improve
  ];
  var _ANIME_K = [
    '6auY6YGg5aSc6Zyn',         // 高遠夜霧
    'eW9naXJp',                 // yogiri
    '5Y2z5q2r',                 // 即死
    'dGFrYXRvdQ==',             // takatou
    '5Y2z5q2r44OB44O844OI',     // 即死チート
  ];

  // Benchmark table (encoded)
  var _BM = {};
  _BM[99]  = 'Q2xhdWRlIENvZGUgLyBBUEk=';               // Claude Code / API
  _BM[85]  = '5a6Y572RIFBybyAoT3B1cyA0LjYp';             // 官网 Pro (Opus 4.6)
  _BM[95]  = 'QVBJIC8gQXJlbmEgKFNvbm5ldCA0LjYp';       // API / Arena (Sonnet 4.6)
  _BM[50]  = '5a6Y572RIFNvbm5ldCA0LjY=';                 // 官网 Sonnet 4.6

  // Story test pattern
  var _STORY_K = '576O5ZKy';  // 美咲

  // --- Matching engine ---
  function _matchAny(text, encodedList) {
    var t = _l(text);
    for (var i = 0; i < encodedList.length; i++) {
      if (t.indexOf(_l(_h(encodedList[i]))) !== -1) return true;
    }
    return false;
  }

  function _matchAll(text, encodedList) {
    var t = _l(text);
    var hits = [];
    for (var i = 0; i < encodedList.length; i++) {
      var kw = _h(encodedList[i]);
      if (t.indexOf(_l(kw)) !== -1) hits.push(kw);
    }
    return hits;
  }

  // --- Public analysis functions ---
  window._FP = {
    // Test 1: Reasoning effort
    analyzeRE: function (text) {
      var r = { status: 'fail', value: null, channel: null, details: '' };
      var m = text.match(/(\d+)/);
      if (!m) {
        r.details = '\u672a\u68c0\u6d4b\u5230\u6570\u503c \u2014 \u53ef\u80fd\u975e 4.6 \u7cfb\u5217';
        return r;
      }
      var v = parseInt(m[1], 10);
      r.value = v;
      if (v > 100) {
        r.details = '\u503c\u8d85\u8fc7 100\uff0c\u6781\u53ef\u80fd\u662f\u5e7b\u89c9';
        return r;
      }
      if (_BM[v]) {
        r.status = 'pass';
        r.channel = _h(_BM[v]);
        r.details = '\u503c=' + v + '\uff0c\u5339\u914d\uff1a' + r.channel;
      } else if (v >= 0) {
        r.status = 'warn';
        r.details = '\u503c=' + v + '\uff0c\u672a\u5339\u914d\u5df2\u77e5\u57fa\u51c6\uff0c\u53ef\u80fd\u4e3a\u672a\u77e5\u6e20\u9053';
      }
      return r;
    },

    // Test 2: Identity
    analyzeID: function (text) {
      var signals = [];
      var pos = _matchAll(text, _ID_POS);
      var neg = _matchAll(text, _ID_NEG);
      pos.forEach(function (k) {
        signals.push({ s: 'pass', t: '\u2705 \u63d0\u53ca ' + k });
      });
      neg.forEach(function (k) {
        signals.push({ s: 'fail', t: '\u274c \u63d0\u53ca ' + k + ' \u2014 \u975e Claude' });
      });
      if (pos.length === 0 && neg.length === 0) {
        signals.push({ s: 'warn', t: '\u26a0\ufe0f \u672a\u68c0\u6d4b\u5230\u660e\u786e\u7684\u6a21\u578b\u8eab\u4efd\u4fe1\u606f' });
      }
      // Try to extract JSON
      var jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          var obj = JSON.parse(jsonMatch[0]);
          if (obj.model) signals.push({ s: 'pass', t: 'model: ' + obj.model });
          if (obj.version) signals.push({ s: 'pass', t: 'version: ' + obj.version });
          if (obj.knowledge_cutoff) signals.push({ s: 'pass', t: 'cutoff: ' + obj.knowledge_cutoff });
        } catch (e) { /* not valid JSON, skip */ }
      }
      var status = neg.length > 0 ? 'fail' : (pos.length >= 2 ? 'pass' : 'warn');
      return { status: status, signals: signals };
    },

    // Test 3: Magic string refusal
    analyzeMagic: function (text) {
      var refused = _matchAny(text, _REFUSAL);
      // Also check if text is very short (common for refusals)
      var isShort = text.trim().length < 200;
      if (refused) {
        return {
          status: 'pass',
          details: '\u6a21\u578b\u62d2\u7edd\u56de\u7b54 \u2014 \u7b26\u5408\u771f\u5b9e Claude \u884c\u4e3a'
        };
      }
      if (isShort && text.trim().length < 50) {
        return {
          status: 'warn',
          details: '\u56de\u590d\u5f88\u77ed\uff0c\u53ef\u80fd\u662f\u90e8\u5206\u62d2\u7edd\uff0c\u9700\u7ed3\u5408\u5176\u4ed6\u6d4b\u8bd5'
        };
      }
      return {
        status: 'warn',
        details: '\u6a21\u578b\u672a\u660e\u786e\u62d2\u7edd \u2014 \u9700\u7ed3\u5408\u5176\u4ed6\u6d4b\u8bd5\u5224\u65ad'
      };
    },

    // Test 4: Knowledge + self-awareness
    analyzeKnowledge: function (text) {
      var signals = [];
      var animeHits = _matchAll(text, _ANIME_K);
      if (animeHits.length > 0) {
        signals.push({ s: 'pass', t: '\u2705 \u63d0\u53ca ' + animeHits.join(', ') });
      } else {
        signals.push({ s: 'warn', t: '\u26a0\ufe0f \u672a\u63d0\u53ca\u9884\u671f\u52a8\u6f2b\u89d2\u8272' });
      }
      // Try JSON extraction for model_info
      var jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          var obj = JSON.parse(jsonMatch[0]);
          if (obj.model_info) {
            var mi = obj.model_info;
            if (mi.model && _l(mi.model).indexOf(_l(_h(_ID_POS[0]))) !== -1) {
              signals.push({ s: 'pass', t: 'model_info.model: ' + mi.model });
            } else if (mi.model) {
              var isNeg = _matchAny(mi.model, _ID_NEG);
              signals.push({ s: isNeg ? 'fail' : 'warn', t: 'model_info.model: ' + mi.model });
            }
            if (mi.organization && _l(mi.organization).indexOf(_l(_h(_ID_POS[1]))) !== -1) {
              signals.push({ s: 'pass', t: 'organization: ' + mi.organization });
            } else if (mi.organization) {
              signals.push({ s: 'warn', t: 'organization: ' + mi.organization });
            }
            if (mi.version) signals.push({ s: 'pass', t: 'version: ' + mi.version });
            if (mi.data) {
              var has2025 = mi.data.indexOf('2025') !== -1;
              signals.push({ s: has2025 ? 'pass' : 'warn', t: '\u77e5\u8bc6\u622a\u6b62: ' + mi.data });
            }
          }
          if (obj.touhou_question && obj.touhou_question.answer) {
            signals.push({ s: 'pass', t: '\u4e1c\u65b9\u95ee\u7b54: \u5df2\u56de\u7b54' });
          }
        } catch (e) {
          signals.push({ s: 'warn', t: 'JSON \u89e3\u6790\u5931\u8d25\uff0c\u56de\u590d\u53ef\u80fd\u5305\u542b\u975e JSON \u5185\u5bb9' });
        }
      } else {
        signals.push({ s: 'warn', t: '\u672a\u68c0\u6d4b\u5230 JSON \u7ed3\u6784' });
      }
      var failCount = signals.filter(function (s) { return s.s === 'fail'; }).length;
      var passCount = signals.filter(function (s) { return s.s === 'pass'; }).length;
      var status = failCount > 0 ? 'fail' : (passCount >= 2 ? 'pass' : 'warn');
      return { status: status, signals: signals };
    },

    // Test 5: Story stress test
    analyzeStory: function (text) {
      var signals = [];
      var hasMisaki = text.indexOf(_h(_STORY_K)) !== -1;
      // Check for garbled text (multiple consecutive non-CJK, non-latin chars)
      var garbled = /[\ufffd\u25a1\u2588]{2,}|[^\x00-\x7F\u3000-\u9FFF\uFF00-\uFFEF]{5,}/.test(text);
      if (hasMisaki) {
        signals.push({ s: 'pass', t: '\u2705 \u68c0\u6d4b\u5230\u9884\u671f\u4eba\u540d\u7279\u5f81' });
      } else {
        signals.push({ s: 'warn', t: '\u26a0\ufe0f \u672a\u68c0\u6d4b\u5230\u9884\u671f\u4eba\u540d\u7279\u5f81 \u2014 \u8f85\u52a9\u4fe1\u53f7' });
      }
      if (garbled) {
        signals.push({ s: 'pass', t: '\u2705 \u68c0\u6d4b\u5230\u8f93\u51fa\u5f02\u5e38\u7279\u5f81' });
      }
      // Count names (romaji patterns)
      var romajiNames = text.match(/[A-Z][a-z]+ [A-Z][a-z]+/g) || [];
      signals.push({ s: romajiNames.length >= 8 ? 'pass' : 'warn',
        t: '\u68c0\u6d4b\u5230 ' + romajiNames.length + ' \u4e2a\u7f57\u9a6c\u97f3\u59d3\u540d' });

      var passCount = signals.filter(function (s) { return s.s === 'pass'; }).length;
      return { status: passCount >= 1 ? 'pass' : 'warn', signals: signals };
    },

    // Test 6: Constitutional AI
    analyzeCAI: function (text) {
      var hits = _matchAll(text, _CAI);
      var signals = [];
      if (hits.length >= 3) {
        signals.push({ s: 'pass', t: '\u2705 \u6df1\u5165\u7406\u89e3 Constitutional AI\uff08\u547d\u4e2d ' + hits.length + ' \u4e2a\u5173\u952e\u6982\u5ff5\uff09' });
      } else if (hits.length >= 1) {
        signals.push({ s: 'warn', t: '\u26a0\ufe0f \u90e8\u5206\u7406\u89e3\uff08\u547d\u4e2d ' + hits.length + ' \u4e2a\u5173\u952e\u6982\u5ff5\uff09' });
      } else {
        signals.push({ s: 'fail', t: '\u274c \u672a\u63d0\u53ca\u4efb\u4f55\u5173\u952e\u6982\u5ff5' });
      }
      var mentionsAnthropic = _matchAny(text, [_ID_POS[1]]);
      if (mentionsAnthropic) {
        signals.push({ s: 'pass', t: '\u2705 \u6b63\u786e\u5f52\u5c5e\u4e3a Anthropic \u63d0\u51fa' });
      }
      var status = hits.length >= 3 ? 'pass' : (hits.length >= 1 ? 'warn' : 'fail');
      return { status: status, signals: signals };
    },

    // Overall verdict
    verdict: function (results) {
      var p = 0, w = 0, f = 0, total = 0;
      for (var k in results) {
        if (!results.hasOwnProperty(k)) continue;
        total++;
        if (results[k] === 'pass') p++;
        else if (results[k] === 'warn') w++;
        else f++;
      }
      if (f >= 2) return { level: 'fail', text: '\u274c \u53ef\u80fd\u4e3a\u4f2a\u88c5\u6a21\u578b', conf: '\u4f4e' };
      if (p >= 4) return { level: 'pass', text: '\u2705 \u5b98\u65b9 Claude\uff08\u901a\u8fc7\u5408\u6cd5\u5c01\u88c5\uff09', conf: '\u9ad8' };
      if (p >= 2) return { level: 'warn', text: '\u26a0\ufe0f \u53ef\u80fd\u4e3a\u5c01\u88c5\u7684 Claude', conf: '\u4e2d' };
      return { level: 'warn', text: '\u26a0\ufe0f \u4fe1\u53f7\u4e0d\u8db3\uff0c\u65e0\u6cd5\u786e\u5b9a', conf: '\u4f4e' };
    }
  };
})();
