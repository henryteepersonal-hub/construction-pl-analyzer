module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { csv, apiKey } = req.body || {};
  if (!csv || !apiKey) return res.status(400).json({ error: 'Missing csv or apiKey' });

  const SYSTEM = `You are a senior construction CFO analyst. Return ONLY valid JSON, no markdown:
{
  "portfolio_metrics": { "total_revised_contract": 0, "project_count": 0, "avg_gross_margin": 0, "avg_net_margin": 0, "avg_co_rate": 0, "billing_efficiency": 0, "total_retention": 0 },
  "verdict": { "rating": "healthy", "summary": "text" },
  "narrative": "text",
  "strengths": ["s1","s2","s3"],
  "risks": ["r1","r2","r3"],
  "recommendations": ["rec1","rec2","rec3"]
}
Benchmarks: gross margin healthy 40-50%, net margin 25-35%, CO rate under 10% clean, billing efficiency above 90% strong, retention over 8% elevated.`;

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
        max_tokens: 1500,
        system: SYSTEM,
        messages: [{ role: 'user', content: `CSV data:\n\n${csv}\n\nReturn JSON analysis now.` }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data?.error?.message || JSON.stringify(data) });

    const raw = (data.content || []).map(b => b.text || '').join('');
    const clean = raw.replace(/```json|```/g, '').trim();

    try {
      return res.status(200).json(JSON.parse(clean));
    } catch(e) {
      return res.status(500).json({ error: 'Parse failed: ' + raw.slice(0, 300) });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
