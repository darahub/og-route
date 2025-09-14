// Supabase service for traffic data storage and synchronization
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  TrafficPattern, 
  TrafficHotspot, 
  AlternativeRoute, 
  TrafficAnalytics, 
  TrafficDataCollection,
  StoredTrafficData 
} from '../types/trafficStorage';

interface SupabaseTrafficPattern {
  id?: string;
  user_id?: string;
  location_key: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  severity: 'low' | 'moderate' | 'high' | 'severe';
  congestion_level: number;
  average_speed: number;
  confidence: number;
  timestamp: string;
  day_of_week: number;
  hour_of_day: number;
  month: number;
  season: 'spring' | 'summer' | 'fall' | 'winter';
  weather_conditions?: string;
  is_holiday: boolean;
  is_weekend: boolean;
  is_rush_hour: boolean;
}

interface SupabaseTrafficHotspot {
  id?: string;
  user_id?: string;
  location_key: string;
  latitude: number;
  longitude: number;
  name: string;
  description?: string;
  severity: 'low' | 'moderate' | 'high' | 'severe';
  frequency: number;
  average_congestion: number;
  peak_hours: number[];
  peak_days: number[];
  seasonal_patterns: {
    spring: number;
    summer: number;
    fall: number;
    winter: number;
  };
  data_points: number;
  last_updated: string;
}

interface SupabaseAlternativeRoute {
  id?: string;
  user_id?: string;
  route_key: string;
  origin_lat: number;
  origin_lng: number;
  destination_lat: number;
  destination_lng: number;
  route_name: string;
  distance: number;
  estimated_duration: number;
  average_speed: number;
  congestion_level: number;
  confidence: number;
  timestamp: string;
  route_type: 'highway' | 'arterial' | 'local' | 'mixed';
  toll_required: boolean;
  road_conditions: string[];
}

interface SupabaseStoredData {
  id?: string;
  user_id?: string;
  collection_data: any;
  analysis_data: any;
  timestamp: string;
  processed: boolean;
}

export class SupabaseTrafficService {
  private static instance: SupabaseTrafficService;
  private supabase: SupabaseClient;
  private isInitialized = false;

  private constructor() {
    this.initializeSupabase();
  }

  static getInstance(): SupabaseTrafficService {
    if (!SupabaseTrafficService.instance) {
      SupabaseTrafficService.instance = new SupabaseTrafficService();
    }
    return SupabaseTrafficService.instance;
  }

  private initializeSupabase(): void {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.warn('Supabase credentials not found. Traffic data will only be stored locally.');
        return;
      }

      this.supabase = createClient(supabaseUrl, supabaseKey);
      this.isInitialized = true;
      console.log('✅ Supabase initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Supabase:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Check if Supabase is available and user is authenticated
   */
  private async isAvailable(): Promise<boolean> {
    if (!this.isInitialized) return false;
    
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      return !!user;
    } catch (error) {
      console.error('Supabase auth check failed:', error);
      return false;
    }
  }

  /**
   * Store traffic pattern to Supabase
   */
  async storeTrafficPattern(pattern: TrafficPattern): Promise<boolean> {
    if (!(await this.isAvailable())) return false;

    try {
      const supabasePattern: SupabaseTrafficPattern = {
        location_key: this.getLocationKey(pattern.location),
        latitude: pattern.location.lat,
        longitude: pattern.location.lng,
        address: pattern.location.address,
        city: pattern.location.city,
        state: pattern.location.state,
        country: pattern.location.country,
        severity: pattern.severity,
        congestion_level: pattern.congestionLevel,
        average_speed: pattern.averageSpeed,
        confidence: pattern.confidence,
        timestamp: pattern.timestamp.toISOString(),
        day_of_week: pattern.dayOfWeek,
        hour_of_day: pattern.hourOfDay,
        month: pattern.month,
        season: pattern.season,
        weather_conditions: pattern.weatherConditions,
        is_holiday: pattern.isHoliday,
        is_weekend: pattern.isWeekend,
        is_rush_hour: pattern.isRushHour
      };

      const { error } = await this.supabase
        .from('traffic_patterns')
        .insert(supabasePattern);

      if (error) {
        console.error('Failed to store traffic pattern:', error);
        return false;
      }

      console.log('✅ Traffic pattern stored to Supabase');
      return true;
    } catch (error) {
      console.error('Error storing traffic pattern:', error);
      return false;
    }
  }

  /**
   * Store traffic hotspot to Supabase
   */
  async storeTrafficHotspot(hotspot: TrafficHotspot): Promise<boolean> {
    if (!(await this.isAvailable())) return false;

    try {
      const supabaseHotspot: SupabaseTrafficHotspot = {
        location_key: this.getLocationKey(hotspot.location),
        latitude: hotspot.location.lat,
        longitude: hotspot.location.lng,
        name: hotspot.name,
        description: hotspot.description,
        severity: hotspot.severity,
        frequency: hotspot.frequency,
        average_congestion: hotspot.averageCongestion,
        peak_hours: hotspot.peakHours,
        peak_days: hotspot.peakDays,
        seasonal_patterns: hotspot.seasonalPatterns,
        data_points: hotspot.dataPoints,
        last_updated: hotspot.lastUpdated.toISOString()
      };

      // Check if hotspot already exists
      const { data: existing } = await this.supabase
        .from('traffic_hotspots')
        .select('id')
        .eq('location_key', supabaseHotspot.location_key)
        .single();

      if (existing) {
        // Update existing hotspot
        const { error } = await this.supabase
          .from('traffic_hotspots')
          .update(supabaseHotspot)
          .eq('id', existing.id);

        if (error) {
          console.error('Failed to update traffic hotspot:', error);
          return false;
        }
      } else {
        // Insert new hotspot
        const { error } = await this.supabase
          .from('traffic_hotspots')
          .insert(supabaseHotspot);

        if (error) {
          console.error('Failed to store traffic hotspot:', error);
          return false;
        }
      }

      console.log('✅ Traffic hotspot stored to Supabase');
      return true;
    } catch (error) {
      console.error('Error storing traffic hotspot:', error);
      return false;
    }
  }

  /**
   * Store alternative route to Supabase
   */
  async storeAlternativeRoute(route: AlternativeRoute): Promise<boolean> {
    if (!(await this.isAvailable())) return false;

    try {
      const supabaseRoute: SupabaseAlternativeRoute = {
        route_key: this.getRouteKey(route.origin, route.destination),
        origin_lat: route.origin.lat,
        origin_lng: route.origin.lng,
        destination_lat: route.destination.lat,
        destination_lng: route.destination.lng,
        route_name: route.routeName,
        distance: route.distance,
        estimated_duration: route.estimatedDuration,
        average_speed: route.averageSpeed,
        congestion_level: route.congestionLevel,
        confidence: route.confidence,
        timestamp: route.timestamp.toISOString(),
        route_type: route.routeType,
        toll_required: route.tollRequired,
        road_conditions: route.roadConditions
      };

      const { error } = await this.supabase
        .from('alternative_routes')
        .insert(supabaseRoute);

      if (error) {
        console.error('Failed to store alternative route:', error);
        return false;
      }

      console.log('✅ Alternative route stored to Supabase');
      return true;
    } catch (error) {
      console.error('Error storing alternative route:', error);
      return false;
    }
  }

  /**
   * Store traffic analysis data to Supabase
   */
  async storeTrafficAnalysis(collection: TrafficDataCollection, analysis: any): Promise<boolean> {
    if (!(await this.isAvailable())) return false;

    try {
      const supabaseData: SupabaseStoredData = {
        collection_data: collection,
        analysis_data: analysis,
        timestamp: new Date().toISOString(),
        processed: true
      };

      const { error } = await this.supabase
        .from('stored_traffic_data')
        .insert(supabaseData);

      if (error) {
        console.error('Failed to store traffic analysis:', error);
        return false;
      }

      console.log('✅ Traffic analysis stored to Supabase');
      return true;
    } catch (error) {
      console.error('Error storing traffic analysis:', error);
      return false;
    }
  }

  /**
   * Get traffic analytics from Supabase
   */
  async getTrafficAnalytics(location?: { lat: number; lng: number }): Promise<TrafficAnalytics | null> {
    if (!(await this.isAvailable())) return null;

    try {
      const { data, error } = await this.supabase
        .rpc('get_traffic_analytics', {
          p_user_id: (await this.supabase.auth.getUser()).data.user?.id,
          p_latitude: location?.lat || null,
          p_longitude: location?.lng || null,
          p_radius_km: 10
        });

      if (error) {
        console.error('Failed to get traffic analytics:', error);
        return null;
      }

      return data as TrafficAnalytics;
    } catch (error) {
      console.error('Error getting traffic analytics:', error);
      return null;
    }
  }

  /**
   * Get nearby hotspots from Supabase
   */
  async getNearbyHotspots(location: { lat: number; lng: number }, radiusKm: number = 5): Promise<TrafficHotspot[]> {
    if (!(await this.isAvailable())) return [];

    try {
      const { data, error } = await this.supabase
        .from('traffic_hotspots')
        .select('*')
        .gte('latitude', location.lat - (radiusKm / 111)) // Rough conversion to degrees
        .lte('latitude', location.lat + (radiusKm / 111))
        .gte('longitude', location.lng - (radiusKm / (111 * Math.cos(location.lat * Math.PI / 180))))
        .lte('longitude', location.lng + (radiusKm / (111 * Math.cos(location.lat * Math.PI / 180))))
        .order('average_congestion', { ascending: false });

      if (error) {
        console.error('Failed to get nearby hotspots:', error);
        return [];
      }

      return data.map(this.convertSupabaseHotspotToHotspot);
    } catch (error) {
      console.error('Error getting nearby hotspots:', error);
      return [];
    }
  }

  /**
   * Sync local data to Supabase
   */
  async syncLocalDataToSupabase(localData: {
    trafficPatterns: Map<string, TrafficPattern[]>;
    hotspots: Map<string, TrafficHotspot>;
    alternativeRoutes: Map<string, AlternativeRoute[]>;
    storedData: Map<string, StoredTrafficData>;
  }): Promise<{ success: number; failed: number }> {
    if (!(await this.isAvailable())) {
      return { success: 0, failed: 0 };
    }

    let success = 0;
    let failed = 0;

    try {
      // Sync traffic patterns
      for (const [, patterns] of localData.trafficPatterns) {
        for (const pattern of patterns) {
          const result = await this.storeTrafficPattern(pattern);
          if (result) success++; else failed++;
        }
      }

      // Sync hotspots
      for (const [, hotspot] of localData.hotspots) {
        const result = await this.storeTrafficHotspot(hotspot);
        if (result) success++; else failed++;
      }

      // Sync alternative routes
      for (const [, routes] of localData.alternativeRoutes) {
        for (const route of routes) {
          const result = await this.storeAlternativeRoute(route);
          if (result) success++; else failed++;
        }
      }

      // Sync stored data
      for (const [, data] of localData.storedData) {
        const result = await this.storeTrafficAnalysis(data.collection, data.analysis);
        if (result) success++; else failed++;
      }

      console.log(`✅ Supabase sync completed: ${success} successful, ${failed} failed`);
      return { success, failed };
    } catch (error) {
      console.error('Error syncing data to Supabase:', error);
      return { success, failed };
    }
  }

  /**
   * Sign in user
   */
  async signIn(email: string, password: string): Promise<boolean> {
    if (!this.isInitialized) return false;

    try {
      const { error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Sign in failed:', error);
        return false;
      }

      console.log('✅ User signed in successfully');
      return true;
    } catch (error) {
      console.error('Error signing in:', error);
      return false;
    }
  }

  /**
   * Sign up user
   */
  async signUp(email: string, password: string): Promise<boolean> {
    if (!this.isInitialized) return false;

    try {
      const { error } = await this.supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        console.error('Sign up failed:', error);
        return false;
      }

      console.log('✅ User signed up successfully');
      return true;
    } catch (error) {
      console.error('Error signing up:', error);
      return false;
    }
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<boolean> {
    if (!this.isInitialized) return false;

    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        console.error('Sign out failed:', error);
        return false;
      }

      console.log('✅ User signed out successfully');
      return true;
    } catch (error) {
      console.error('Error signing out:', error);
      return false;
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<any> {
    if (!this.isInitialized) return null;

    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Helper methods
  private getLocationKey(location: { lat: number; lng: number }): string {
    return `${location.lat.toFixed(4)},${location.lng.toFixed(4)}`;
  }

  private getRouteKey(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }): string {
    return `${this.getLocationKey(origin)}-${this.getLocationKey(destination)}`;
  }

  private convertSupabaseHotspotToHotspot(supabaseHotspot: SupabaseTrafficHotspot): TrafficHotspot {
    return {
      id: supabaseHotspot.id || '',
      location: {
        lat: supabaseHotspot.latitude,
        lng: supabaseHotspot.longitude
      },
      name: supabaseHotspot.name,
      description: supabaseHotspot.description,
      severity: supabaseHotspot.severity,
      frequency: supabaseHotspot.frequency,
      averageCongestion: supabaseHotspot.average_congestion,
      peakHours: supabaseHotspot.peak_hours,
      peakDays: supabaseHotspot.peak_days,
      seasonalPatterns: supabaseHotspot.seasonal_patterns,
      alternativeRoutes: [], // Will be populated separately if needed
      lastUpdated: new Date(supabaseHotspot.last_updated),
      dataPoints: supabaseHotspot.data_points
    };
  }
}
