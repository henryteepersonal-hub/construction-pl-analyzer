module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { csv, apiKey } = req.body || {};
  if (!csv) return res.status(400).json({ error: 'Missing csv' });
  if (!apiKey) return res.status(400).json({ error: 'Missing apiKey' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Say hello in JSON: {"message":"hello"}' }]
      })
    });

    const data = await response.json();
    return res.status(200).json({ status: response.status, data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
