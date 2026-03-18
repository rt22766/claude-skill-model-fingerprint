/**
 * api-client.js - API call engine
 * Supports Anthropic native format and OpenAI-compatible format.
 * All calls happen in the browser — no backend involved.
 *
 * NOTE: Anthropic's official API does not support browser CORS.
 * Users must either:
 *   1. Use a CORS-enabled proxy/mirror as Base URL
 *   2. Use OpenAI-compatible format with a third-party relay that supports CORS
 */
;(function () {
  'use strict';

  var DEFAULTS = {
    anthropic: 'https://api.anthropic.com',
    openai: 'https://api.openai.com'
  };

  var CORS_ERROR_MSG = '[CORS 错误] 浏览器无法直接访问 Anthropic 官方 API（跨域限制）。\n\n请选择以下方式之一：\n1. 填写支持 CORS 的中转/代理地址作为 Base URL\n2. 切换为"OpenAI 兼容"格式并使用第三方中转服务\n\n详情见 GitHub README。';

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

  /**
   * Send a message to the API and return the text response.
   */
  async function callAPI(prompt, cfg, signal) {
    try {
      if (cfg.format === 'anthropic') {
        return await callAnthropic(prompt, cfg, signal);
      }
      return await callOpenAI(prompt, cfg, signal);
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      // Detect CORS / network errors
      if (e.message === 'Failed to fetch' || e.message.indexOf('NetworkError') !== -1) {
        throw new Error(CORS_ERROR_MSG);
      }
      throw e;
    }
  }

  async function callAnthropic(prompt, cfg, signal) {
    var url = cfg.base + '/v1/messages';
    var resp = await fetch(url, {
      method: 'POST',
      signal: signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': cfg.key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!resp.ok) {
      var errBody = await resp.text().catch(function () { return ''; });
      throw new Error('API ' + resp.status + ': ' + (errBody || resp.statusText));
    }

    var data = await resp.json();
    if (data.content && data.content[0] && data.content[0].text) {
      return data.content[0].text;
    }
    throw new Error('Unexpected response structure');
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
      throw new Error('API ' + resp.status + ': ' + (errBody || resp.statusText));
    }

    var data = await resp.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    }
    throw new Error('Unexpected response structure');
  }

  window._API = {
    getConfig: getConfig,
    validateConfig: validateConfig,
    callAPI: callAPI
  };
})();
