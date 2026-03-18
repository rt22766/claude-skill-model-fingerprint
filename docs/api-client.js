/**
 * api-client.js - API call engine
 * Supports Anthropic native format and OpenAI-compatible format.
 * All calls happen in the browser — no backend involved.
 */
;(function () {
  'use strict';

  var DEFAULTS = {
    anthropic: 'https://api.anthropic.com',
    openai: 'https://api.openai.com'
  };

  function getConfig() {
    var fmt = document.getElementById('api-format').value;
    var base = document.getElementById('api-base').value.trim().replace(/\/+$/, '');
    var key = document.getElementById('api-key').value.trim();
    var model = document.getElementById('api-model-custom').value.trim()
      || document.getElementById('api-model').value;

    if (!base) base = DEFAULTS[fmt];
    return { format: fmt, base: base, key: key, model: model };
  }

  function validateConfig(cfg) {
    if (!cfg.key) return '请输入 API Key';
    if (!cfg.model) return '请选择或输入模型名称';
    return null;
  }

  async function callAPI(prompt, cfg, signal) {
    try {
      if (cfg.format === 'anthropic') {
        return await callAnthropic(prompt, cfg, signal);
      }
      return await callOpenAI(prompt, cfg, signal);
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      if (e.message === 'Failed to fetch' || e.message.indexOf('NetworkError') !== -1) {
        var isDefault = cfg.base === DEFAULTS[cfg.format];
        if (isDefault) {
          throw new Error('[CORS 错误] 浏览器无法直接访问 ' + cfg.base + '（跨域限制）。\n请在 Base URL 填入支持 CORS 的中转地址。');
        }
        throw new Error('[网络错误] 无法连接 ' + cfg.base + '\n可能原因：\n1. 该地址不支持浏览器跨域(CORS)\n2. URL 地址不正确\n3. 服务不可用\n\n建议：确认 Base URL 正确，且中转服务已配置 CORS（Access-Control-Allow-Origin）');
      }
      throw e;
    }
  }

  async function callAnthropic(prompt, cfg, signal) {
    var url = cfg.base + '/v1/messages';
    var headers = {
      'Content-Type': 'application/json',
      'x-api-key': cfg.key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    };

    // For third-party proxies: also try Authorization header as fallback
    var isThirdParty = cfg.base !== DEFAULTS.anthropic;
    if (isThirdParty) {
      headers['Authorization'] = 'Bearer ' + cfg.key;
    }

    var resp = await fetch(url, {
      method: 'POST',
      signal: signal,
      headers: headers,
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!resp.ok) {
      var errBody = await resp.text().catch(function () { return ''; });
      // Try to parse error JSON for better message
      var errMsg = 'API ' + resp.status;
      try {
        var errJson = JSON.parse(errBody);
        errMsg += ': ' + (errJson.error && errJson.error.message || errJson.message || errBody);
      } catch (_) {
        errMsg += ': ' + (errBody || resp.statusText);
      }
      throw new Error(errMsg);
    }

    var data = await resp.json();
    // Anthropic format
    if (data.content && data.content[0] && data.content[0].text) {
      return data.content[0].text;
    }
    // Some proxies return OpenAI format even on Anthropic endpoint
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    }
    throw new Error('无法解析响应格式，请尝试切换 API 格式');
  }

  async function callOpenAI(prompt, cfg, signal) {
    var url = cfg.base + '/v1/chat/completions';
    var resp = await fetch(url, {
      method: 'POST',
      signal: signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + cfg.key
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!resp.ok) {
      var errBody = await resp.text().catch(function () { return ''; });
      var errMsg = 'API ' + resp.status;
      try {
        var errJson = JSON.parse(errBody);
        errMsg += ': ' + (errJson.error && errJson.error.message || errJson.message || errBody);
      } catch (_) {
        errMsg += ': ' + (errBody || resp.statusText);
      }
      throw new Error(errMsg);
    }

    var data = await resp.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    }
    // Fallback: Anthropic format from proxy
    if (data.content && data.content[0] && data.content[0].text) {
      return data.content[0].text;
    }
    throw new Error('无法解析响应格式，请尝试切换 API 格式');
  }

  window._API = {
    getConfig: getConfig,
    validateConfig: validateConfig,
    callAPI: callAPI
  };
})();
