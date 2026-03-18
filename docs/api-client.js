/**
 * api-client.js - API call engine (OpenAI-compatible format only)
 * All calls happen in the browser — no backend involved.
 * Uses /v1/chat/completions endpoint (OpenAI compatible).
 */
;(function () {
  'use strict';

  function getConfig() {
    var base = document.getElementById('api-base').value.trim().replace(/\/+$/, '');
    var key = document.getElementById('api-key').value.trim();
    var model = document.getElementById('api-model-custom').value.trim()
      || document.getElementById('api-model').value;

    return { base: base, key: key, model: model };
  }

  function validateConfig(cfg) {
    if (!cfg.base) return '请输入 Base URL（中转服务地址）';
    if (!cfg.key) return '请输入 API Key';
    if (!cfg.model) return '请选择或输入模型名称';
    return null;
  }

  async function callAPI(prompt, cfg, signal) {
    var url = cfg.base + '/v1/chat/completions';
    var resp;

    try {
      resp = await fetch(url, {
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
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      if (e.message === 'Failed to fetch' || e.message.indexOf('NetworkError') !== -1) {
        throw new Error('[网络错误] 无法连接 ' + cfg.base + '\n\n可能原因：\n1. Base URL 不正确\n2. 服务不支持浏览器跨域(CORS)\n3. 服务不可用\n\n请确认中转服务已配置 Access-Control-Allow-Origin');
      }
      throw e;
    }

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

    // OpenAI format
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    }
    // Anthropic format (some proxies return this)
    if (data.content && data.content[0] && data.content[0].text) {
      return data.content[0].text;
    }

    throw new Error('无法解析响应格式，请确认 Base URL 和模型名称正确');
  }

  window._API = {
    getConfig: getConfig,
    validateConfig: validateConfig,
    callAPI: callAPI
  };
})();
