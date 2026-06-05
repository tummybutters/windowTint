const MAX_BODY_BYTES = 64 * 1024;

const readBody = async (req) => {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);

  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error('Request body too large');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
};

const buildRecord = (event) => ({
  received_at: new Date().toISOString(),
  event_name: String(event.event_name || '').slice(0, 120),
  event_time: String(event.event_time || '').slice(0, 80),
  event_id: String(event.event_id || '').slice(0, 160),
  session_id: String(event.session_id || '').slice(0, 180),
  page_path: String(event.page_path || '').slice(0, 240),
  page_url: String(event.page_url || '').slice(0, 1000),
  referrer: String(event.referrer || '').slice(0, 1000),
  lead: event.lead && typeof event.lead === 'object' ? event.lead : {},
  payload: event.payload && typeof event.payload === 'object' ? event.payload : {}
});

const forwardRecord = async (record) => {
  if (!process.env.LEAD_EVENT_WEBHOOK_URL || typeof fetch !== 'function') return;

  await fetch(process.env.LEAD_EVENT_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record)
  });
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const event = await readBody(req);
    const record = buildRecord(event);

    if (!record.event_name || !record.session_id) {
      return res.status(400).json({ ok: false, error: 'Missing event_name or session_id' });
    }

    console.log('[obsidian-lead-event]', JSON.stringify(record));
    await forwardRecord(record);

    return res.status(202).json({ ok: true });
  } catch (error) {
    const status = error.statusCode || 400;
    console.error('[obsidian-lead-event-error]', error);
    return res.status(status).json({ ok: false, error: 'Invalid lead event' });
  }
};
