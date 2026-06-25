module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { csv, apiKey } = req.body || {};
  if (!csv) return res.status(400).json({ error: 'Missing csv' });
  if (!apiKey) return res.status(400).json({ error: 'Missing apiKey' });

  const SYSTEM = `You are a senior construction CFO analyst specializing in high-end residential GC projects. You are analyzing a Sage 300 job cost report organized by cost code division.

The CSV columns are: Division, Cost Code, Description, Budget, Committed, Budget-Committed Difference, Job Cost to Date, Committed Remaining, Variance

Analyze the data and return ONLY this JSON with no extra text or markdown:
{"summary_metrics":{"total_budget":0,"total_job_cost_to_date":0,"total_committed":0,"total_variance":0,"budget_utilization":0,"cost_overrun_divisions":[],"top_spend_divisions":[]},"verdict":{"rating":"healthy","summary":"text"},"narrative":"text","strengths":["s1","s2","s3"],"risks":["r1","r2","r3"],"recommendations":["r1","r2","r3"]}

Rules:
- budget_utilization = total_job_cost_to_date / total_budget (decimal 0-1)
- cost_overrun_divisions = division names where job cost > budget
- top_spend_divisions = top 3 divisions by job cost to date
- verdict rating: "healthy" if cost < 90% of budget, "caution" if 90-100%, "critical" if over budget
- narrative should be 3 paragraphs covering spend by division, overruns, and cost control observations
- Use specific cost code names and dollar figures
- All numbers as plain numbers, no $ signs`;

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
        messages: [{ role: 'user', content: `Job cost report CSV:\n\n${csv}\n\nReturn JSON analysis only.` }]
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
