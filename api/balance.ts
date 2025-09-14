import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ZeroGComputeService } from '../src/services/0gComputeService';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const balance = await ZeroGComputeService.getBalance();
    res.status(200).json({ balance });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to get balance' });
  }
}


