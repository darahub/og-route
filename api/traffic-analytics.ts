import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { lat, lng, timeframe = 'all' } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const location = {
      lat: parseFloat(lat as string),
      lng: parseFloat(lng as string)
    };

    // Return mock analytics since 0G services won't work in serverless
    const response = {
      location,
      timeframe,
      analytics: {
        averageCongestion: 45,
        peakHours: ['7:00-9:00', '17:00-19:00'],
        averageSpeed: 35,
        totalIncidents: 2
      },
      hotspots: [
        {
          id: 'mock-hotspot-1',
          location: { lat: location.lat + 0.01, lng: location.lng + 0.01 },
          severity: 'moderate',
          description: 'Mock traffic hotspot'
        }
      ],
      timestamp: new Date().toISOString(),
      note: '0G analytics services not available in serverless environment'
    };

    res.status(200).json(response);
    
  } catch (error: any) {
    console.error('Traffic analytics API error:', error);
    res.status(500).json({ error: error?.message || 'Failed to get traffic analytics' });
  }
}
