import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Return mock metadata stats
    const stats = {
      totalRecords: 0,
      dataTypes: {},
      recentRecords: [],
      note: 'Storage metadata not available in serverless environment'
    };

    res.status(200).json(stats);

  } catch (error: any) {
    console.error('Failed to get metadata:', error);
    res.status(500).json({ error: error?.message || 'Failed to get metadata' });
  }
}
