// Real AI service using 0G Compute (with fallback)
import { ZeroGComputeService } from './0gComputeService';

export interface TrafficAnalysisRequest {
  currentTraffic: any[];
  userLocation: any;
  destination: string;
  timeOfDay: string;
  weatherConditions?: string;
}

export interface TrafficInsight {
  severity: 'low' | 'moderate' | 'high' | 'severe';
  confidence: number;
  summary: string;
  recommendations: string[];
  predictedCongestion: number;
  bestTimeToTravel: string;
  alternativeRoutesSuggestion: string;
  estimatedDelay: number;
}

export class TogetherAIService {
  private static instance: TogetherAIService;

  static getInstance(): TogetherAIService {
    if (!TogetherAIService.instance) {
      TogetherAIService.instance = new TogetherAIService();
    }
    return TogetherAIService.instance;
  }

  async analyzeTrafficConditions(request: TrafficAnalysisRequest): Promise<TrafficInsight> {
    console.log('AI: Analyzing traffic conditions', request);
    console.log('Traffic data length:', request.currentTraffic?.length || 0);
    console.log('User location:', request.userLocation);
    console.log('Destination:', request.destination);
    console.log('Time of day:', request.timeOfDay);
    
    try {
      // Use real 0G Compute for AI analysis
      const aiAnalysis = await ZeroGComputeService.analyzeTrafficConditions({
        currentTraffic: request.currentTraffic,
        userLocation: request.userLocation,
        destination: request.destination,
        timeOfDay: request.timeOfDay,
        weatherConditions: request.weatherConditions
      });

      console.log('0G Compute analysis result:', aiAnalysis);
      
      // Return in the exact shape the UI expects
      return {
        severity: aiAnalysis.severity,
        confidence: aiAnalysis.confidence,
        summary: aiAnalysis.summary,
        recommendations: aiAnalysis.recommendations,
        predictedCongestion: aiAnalysis.predictedCongestion,
        bestTimeToTravel: aiAnalysis.bestTimeToTravel,
        alternativeRoutesSuggestion: aiAnalysis.alternativeRoutesSuggestion,
        estimatedDelay: aiAnalysis.estimatedDelay
      };
    } catch (error) {
      console.error('Error in 0G Compute AI traffic analysis:', error);
      // Return a fallback analysis if 0G Compute fails
      return {
        severity: 'moderate',
        confidence: 0.5,
        summary: `Unable to analyze traffic conditions for ${request.destination}. Using fallback analysis.`,
        recommendations: ['Check real-time traffic updates', 'Consider alternative routes'],
        predictedCongestion: 45,
        bestTimeToTravel: 'Now',
        alternativeRoutesSuggestion: 'Consider alternative routes',
        estimatedDelay: 10
      };
    }
  }




}
