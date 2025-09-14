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

    const { ZeroGComputeService } = await import('../src/services/0gComputeService');
    
    const analytics = await ZeroGComputeService.getTrafficAnalytics(location);
    
    const hotspots = await ZeroGComputeService.getNearbyHotspots(location, 10);

    const response = {
      location,
      timeframe,
      analytics,
      hotspots,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
    
  } catch (error: any) {
    console.error('Traffic analytics API error:', error);
    res.status(500).json({ error: error?.message || 'Failed to get traffic analytics' });
  }
}
