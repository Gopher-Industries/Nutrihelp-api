const express = require('express');
const router = express.Router();

const HF_SPACE_URL = (process.env.HF_SPACE_URL || 'https://ngtuanphong-nutribot.hf.space').replace(/\/$/, '');
const HF_SPACE_KEY = (process.env.HF_SPACE_KEY || '').trim();

function buildHeaders(extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };
  if (HF_SPACE_KEY) headers['Authorization'] = `Bearer ${HF_SPACE_KEY}`;
  return headers;
}

async function fetchWithTimeout(url, options, timeoutMs = 180000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// GET /ai-model/chatbot-finetune/healthz
router.get('/healthz', async (_req, res) => {
  try {
    const resp = await fetchWithTimeout(`${HF_SPACE_URL}/healthz`, { headers: buildHeaders() }, 30000);
    let body = {};
    try { body = await resp.json(); } catch { body = { raw: '' }; }
    return res.json({ ok: resp.ok, space_status: resp.status, space_health: body, space_url: HF_SPACE_URL });
  } catch (err) {
    return res.status(502).json({
      status: 'error',
      error: 'Cannot reach Space',
      detail: `${err.constructor.name}: ${err.message}`,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /ai-model/chatbot-finetune/chat
router.post('/chat', async (req, res) => {
  try {
    await fetchWithTimeout(`${HF_SPACE_URL}/healthz`, { headers: buildHeaders() }, 30000).catch(() => {});
  } catch { /* non-fatal preflight */ }

  let lastErr = null;
  const delays = [0, 1500, 3000];

  for (let attempt = 0; attempt < 3; attempt++) {
    if (delays[attempt]) await new Promise((r) => setTimeout(r, delays[attempt]));
    try {
      const resp = await fetchWithTimeout(
        `${HF_SPACE_URL}/v1/chat/completions`,
        { method: 'POST', headers: buildHeaders(), body: JSON.stringify(req.body) },
        180000
      );
      if (!resp.ok) {
        const text = await resp.text();
        return res.status(resp.status).json({
          status: 'error',
          error: 'Space error',
          detail: text.slice(0, 500) + (text.length > 500 ? '…' : ''),
          timestamp: new Date().toISOString(),
        });
      }
      const data = await resp.json();
      return res.json(data);
    } catch (err) {
      lastErr = err;
      if (err.name !== 'AbortError') continue;
      break;
    }
  }

  const isTimeout = lastErr && (lastErr.name === 'AbortError' || lastErr.code === 'UND_ERR_CONNECT_TIMEOUT');
  return res.status(isTimeout ? 504 : 502).json({
    status: 'error',
    error: isTimeout ? 'Gateway timeout reaching Space' : 'Upstream error reaching Space',
    detail: lastErr ? `${lastErr.constructor.name}: ${lastErr.message}` : 'Unknown error',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
