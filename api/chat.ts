import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ZeroGComputeService } from '../src/services/0gComputeService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const hasKey = !!(process.env.PRIVATE_KEY || process.env.ZEROG_PRIVATE_KEY || process.env.VITE_ZEROG_PRIVATE_KEY);
    if (!hasKey) {
      return res.status(500).json({ error: 'Missing 0G private key in environment variables' });
    }
    
    const prompt = String((req.body as any)?.prompt || '');
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Try to get AI response with proper error handling
    try {
      const answer = await ZeroGComputeService.sendAIRequest(prompt);
      res.status(200).json({ answer });
    } catch (aiError: any) {
      console.error('0G Compute AI request failed:', aiError);
      
      // Return a fallback response instead of an error
      const fallbackResponse = {
        severity: 'moderate',
        confidence: 0.6,
        summary: `Traffic analysis temporarily unavailable. Using basic traffic data.`,
        recommendations: [
          'Check real-time traffic updates before departure',
          'Consider alternative routes if available',
          'Allow extra time for your journey'
        ],
        predictedCongestion: 45,
        bestTimeToTravel: 'Current time is optimal for travel',
        alternativeRoutesSuggestion: 'Consider checking alternative routes for better traffic conditions',
        estimatedDelay: 5
      };
      
      res.status(200).json({ answer: JSON.stringify(fallbackResponse) });
    }
  } catch (error: any) {
    console.error('Chat API error:', error);
    res.status(500).json({ error: error?.message || 'Chat failed' });
  }
}


