import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const prompt = String((req.body as any)?.prompt || '');
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Return a fallback response since 0G services won't work in serverless
    const fallbackResponse = {
      severity: 'moderate',
      confidence: 0.6,
      summary: `Traffic analysis service is temporarily unavailable. Using basic traffic data.`,
      recommendations: [
        'Check real-time traffic updates before departure',
        'Consider alternative routes if available',
        'Allow extra time for your journey'
      ],
      predictedCongestion: 45,
      bestTimeToTravel: 'Current time is optimal for travel',
      alternativeRoutesSuggestion: 'Consider checking alternative routes for better traffic conditions',
      estimatedDelay: 5,
      note: '0G AI services not available in serverless environment'
    };
    
    res.status(200).json({ answer: JSON.stringify(fallbackResponse) });
    
  } catch (error: any) {
    console.error('Chat API error:', error);
    res.status(500).json({ error: error?.message || 'Chat failed' });
  }
}


