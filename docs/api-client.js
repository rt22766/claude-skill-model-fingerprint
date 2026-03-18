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
    if (!cfg.key) return 'Please enter your API Key';
    if (!cfg.model) return 'Please select or enter a model';
    return null;
  }

  /**
   * Send a message to the API and return the text response.
   * @param {string} prompt - user message
   * @param {object} cfg - {format, base, key, model}
   * @param {AbortSignal} signal - optional abort signal
   * @returns {Promise<string>} response text
   */
  async function callAPI(prompt, cfg, signal) {
    if (cfg.format === 'anthropic') {
      return callAnthropic(prompt, cfg, signal);
    }
    return callOpenAI(prompt, cfg, signal);
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
    // Anthropic format: data.content[0].text
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
    // OpenAI format: data.choices[0].message.content
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    }
    throw new Error('Unexpected response structure');
  }

  // Expose
  window._API = {
    getConfig: getConfig,
    validateConfig: validateConfig,
    callAPI: callAPI
  };
})();
