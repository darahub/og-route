// Traffic data storage types for comprehensive traffic analysis
export interface TrafficLocation {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface TrafficPattern {
  id: string;
  location: TrafficLocation;
  severity: 'low' | 'moderate' | 'high' | 'severe';
  congestionLevel: number; // 0-100
  averageSpeed: number; // km/h
  confidence: number; // 0-1
  timestamp: Date;
  dayOfWeek: number; // 0-6 (Sunday = 0)
  hourOfDay: number; // 0-23
  month: number; // 1-12
  season: 'spring' | 'summer' | 'fall' | 'winter';
  weatherConditions?: string;
  isHoliday: boolean;
  isWeekend: boolean;
  isRushHour: boolean;
}

export interface AlternativeRoute {
  id: string;
  origin: TrafficLocation;
  destination: TrafficLocation;
  routeName: string;
  distance: number; // meters
  estimatedDuration: number; // seconds
  averageSpeed: number; // km/h
  congestionLevel: number; // 0-100
  confidence: number; // 0-1
  timestamp: Date;
  routeType: 'highway' | 'arterial' | 'local' | 'mixed';
  tollRequired: boolean;
  roadConditions: string[];
}

export interface TrafficHotspot {
  id: string;
  location: TrafficLocation;
  name: string;
  description: string;
  severity: 'low' | 'moderate' | 'high' | 'severe';
  frequency: number; // How often this area has high traffic (0-1)
  averageCongestion: number; // 0-100
  peakHours: number[]; // Array of hours when traffic is worst
  peakDays: number[]; // Array of days (0-6) when traffic is worst
  seasonalPatterns: {
    spring: number;
    summer: number;
    fall: number;
    winter: number;
  };
  alternativeRoutes: AlternativeRoute[];
  lastUpdated: Date;
  dataPoints: number; // Number of data points collected
}

export interface TrafficAnalytics {
  totalDataPoints: number;
  averageCongestion: number;
  peakTrafficHours: { hour: number; congestion: number }[];
  peakTrafficDays: { day: string; congestion: number }[];
  seasonalTrends: {
    season: string;
    averageCongestion: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }[];
  topHotspots: TrafficHotspot[];
  routeRecommendations: {
    from: TrafficLocation;
    to: TrafficLocation;
    bestRoutes: AlternativeRoute[];
    avoidRoutes: AlternativeRoute[];
  }[];
}

export interface TrafficDataCollection {
  location: TrafficLocation;
  currentTraffic: any[];
  destination?: string;
  timeOfDay: string;
  weatherConditions?: string;
  userRoute?: {
    origin: TrafficLocation;
    destination: TrafficLocation;
    route: AlternativeRoute[];
  };
}

export interface StoredTrafficData {
  id: string;
  collection: TrafficDataCollection;
  analysis: {
    severity: 'low' | 'moderate' | 'high' | 'severe';
    confidence: number;
    summary: string;
    recommendations: string[];
    predictedCongestion: number;
    bestTimeToTravel: string;
    alternativeRoutesSuggestion: string;
    estimatedDelay: number;
  };
  timestamp: Date;
  processed: boolean;
}
