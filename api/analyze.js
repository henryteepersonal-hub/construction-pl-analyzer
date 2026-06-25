export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { csv, apiKey } = req.body;
  if (!csv || !apiKey) return res.status(400).json({ error: 'Missing csv or apiKey' });

  const SYSTEM = `You are a senior construction CFO analyst specializing in high-end residential GC projects in Los Angeles. Analyze the provided project cost CSV and return ONLY a valid JSON object with this exact structure — no markdown, no prose outside the JSON:

{
  "portfolio_metrics": {
    "total_revised_contract": <number>,
    "project_count": <number>,
    "avg_gross_margin": <decimal 0-1>,
    "avg_net_margin": <decimal 0-1>,
    "avg_co_rate": <decimal 0-1>,
    "billing_efficiency": <decimal 0-1>,
    "total_retention": <number>
  },
  "verdict": {
    "rating": "healthy" | "caution" | "critical",
    "summary": "<2-3 sentence executive summary of portfolio health>"
  },
  "narrative": "<3-4 paragraph CFO-level portfolio narrative covering margin performance, change order strategy, billing vs collection gaps, retention exposure, and any concentration risk. Use specific project names and dollar figures.>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "risks": ["<risk 1>", "<risk 2>", "<risk 3>"],
  "recommendations": ["<actionable rec 1>", "<actionable rec 2>", "<actionable rec 3>"]
}

Benchmark context for LA luxury residential GCs:
- Gross margin healthy: 40-50%. Below 35% is a warning.
- Net margin healthy: 25-35%. Below 20% needs attention.
- Change order rate: Under 10% is clean. 10-15% is moderate. Over 15% may signal scope control issues.
- Billing efficiency: Above 90% is strong. Below 80% indicates cash flow drag.
- Retention: Flag total retention > 8% of revised contract as elevated.
- Subcontractor concentration: If subs > 40% of direct costs on any project, flag dependency risk.`;

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
        messages: [{ role: 'user', content: `Here is the project cost CSV:\n\n${csv}\n\nReturn the JSON analysis now.` }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || 'API error' });

    const raw = data.content.map(b => b.text || '').join('');
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
