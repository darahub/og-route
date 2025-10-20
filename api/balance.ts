import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(501).json({ error: '0G services not available in serverless environment' });
}


