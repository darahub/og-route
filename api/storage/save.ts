import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { data } = req.body as any;
    if (!data) {
      return res.status(400).json({ error: 'Data is required' });
    }

    // For now, return a mock response since 0G Storage requires running processes
    // that aren't compatible with serverless functions
    const result = {
      rootHash: `0x${Date.now().toString(16)}`,
      txHash: `0x${Math.random().toString(16).slice(2)}`,
      timestamp: new Date().toISOString(),
      note: '0G Storage not available in serverless environment - using mock data'
    };

    console.log('✅ Mock save to 0G Storage:', result);
    res.status(200).json(result);

  } catch (error: any) {
    console.error('Storage save failed:', error);
    res.status(500).json({ error: error?.message || 'Storage save failed' });
  }
}
