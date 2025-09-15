import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    // For now, return a mock balance since 0G services won't work in serverless
    const balance = "0.0";
    res.status(200).json({ balance, note: "0G services not available in serverless environment" });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to get balance' });
  }
}


