// Temporary no-op Supabase service stub to disable Supabase integration
// without breaking imports or application flow.

export type TrafficLevel = 'low' | 'moderate' | 'high' | 'severe';

export interface SaveTrafficConditionInput {
  location_lat: number;
  location_lng: number;
  location_address: string;
  severity: TrafficLevel;
  speed: number;
  duration: number;
  confidence: number;
  timestamp: string;
  predicted_duration: number;
  affected_routes: string[];
  cause?: string;
  description?: string;
}

export interface SaveRouteInput {
  user_id: string;
  origin_lat: number;
  origin_lng: number;
  destination: string;
  destination_lat: number;
  destination_lng: number;
  route_name: string;
  distance: number;
  duration: number;
  duration_with_traffic: number;
  traffic_delay: number;
  traffic_level: TrafficLevel;
  description: string;
  is_recommended: boolean;
  savings?: number;
  waypoints?: string[];
  polyline?: string;
}

export interface SavedRouteRow {
  id?: string;
  user_id: string;
  route_name: string;
  distance: number;
  duration: number;
  duration_with_traffic: number;
  traffic_delay: number;
  traffic_level: TrafficLevel;
  description: string;
  is_recommended: boolean;
  savings?: number;
  waypoints?: string[];
  polyline?: string;
}

export class SupabaseService {
  static async saveTrafficCondition(_input: SaveTrafficConditionInput): Promise<void> {
    // Intentionally no-op
    console.info('[SupabaseService] saveTrafficCondition disabled');
  }

  static async saveRoute(_input: SaveRouteInput): Promise<void> {
    // Intentionally no-op
    console.info('[SupabaseService] saveRoute disabled');
  }

  static async getUserRoutes(_userId: string): Promise<SavedRouteRow[]> {
    // Return empty list to indicate no saved routes while Supabase is disabled
    console.info('[SupabaseService] getUserRoutes disabled');
    return [];
  }

  static async deleteRoute(_routeId: string): Promise<boolean> {
    // Pretend delete succeeded while disabled
    console.info('[SupabaseService] deleteRoute disabled');
    return true;
  }
}


