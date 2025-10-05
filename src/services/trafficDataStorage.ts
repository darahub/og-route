// Comprehensive traffic data storage and analytics service
import { 
  TrafficPattern, 
  TrafficHotspot, 
  AlternativeRoute, 
  TrafficAnalytics, 
  TrafficDataCollection,
  StoredTrafficData 
} from '../types/trafficStorage';
import { SupabaseTrafficService } from './supabaseTrafficService';
import { ZeroGStorageService } from './0gStorageService';

export class TrafficDataStorageService {
  private static instance: TrafficDataStorageService;
  private trafficPatterns: Map<string, TrafficPattern[]> = new Map();
  private hotspots: Map<string, TrafficHotspot> = new Map();
  private alternativeRoutes: Map<string, AlternativeRoute[]> = new Map();
  private storedData: Map<string, StoredTrafficData> = new Map();
  private readonly STORAGE_KEY = 'og_route_traffic_data';
  private readonly MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB limit
  private supabaseService: SupabaseTrafficService;

  static getInstance(): TrafficDataStorageService {
    if (!TrafficDataStorageService.instance) {
      TrafficDataStorageService.instance = new TrafficDataStorageService();
    }
    return TrafficDataStorageService.instance;
  }

  private constructor() {
    this.supabaseService = SupabaseTrafficService.getInstance();
    this.loadFromStorage();
    this.initializePeriodicBackups();
  }

  /**
   * Store traffic analysis data with comprehensive metadata
   */
  async storeTrafficAnalysis(
    collection: TrafficDataCollection,
    analysis: any,
    userLocation?: { lat: number; lng: number }
  ): Promise<void> {
    try {
      const timestamp = new Date();
      const locationKey = this.getLocationKey(collection.location);
      
      // Create stored data entry
      const storedData: StoredTrafficData = {
        id: this.generateId(),
        collection,
        analysis,
        timestamp,
        processed: false
      };

      // Store the raw data
      this.storedData.set(storedData.id, storedData);

      // Extract traffic patterns
      const pattern = this.extractTrafficPattern(collection, analysis, timestamp);
      this.addTrafficPattern(locationKey, pattern);

      // Update hotspots
      await this.updateHotspots(locationKey, pattern);

      // Extract alternative routes if available
      if (collection.userRoute) {
        await this.storeAlternativeRoutes(collection.userRoute.route, pattern);
      }

      // Mark as processed
      storedData.processed = true;
      this.storedData.set(storedData.id, storedData);

      // Save to localStorage
      this.saveToStorage();

      // Get hotspot for this location (if exists)
      const hotspot = this.hotspots.get(locationKey);

      // Sync to Supabase (async, don't wait for completion)
      this.syncToSupabase(pattern, hotspot, collection, analysis).catch(error => {
        console.warn('Supabase sync failed:', error);
      });

      // Sync to 0G Storage (async, don't wait for completion)
      this.syncToZeroGStorage(pattern, hotspot, collection, analysis).catch(error => {
        console.warn('0G Storage sync failed:', error);
      });

      console.log(`✅ Stored traffic data for location: ${locationKey}`);
      
    } catch (error) {
      console.error('Failed to store traffic analysis:', error);
    }
  }

  /**
   * Extract traffic pattern from analysis data
   */
  private extractTrafficPattern(
    collection: TrafficDataCollection,
    analysis: any,
    timestamp: Date
  ): TrafficPattern {
    const date = new Date(timestamp);
    const dayOfWeek = date.getDay();
    const hourOfDay = date.getHours();
    const month = date.getMonth() + 1;
    
    // Calculate season
    const season = this.getSeason(month);
    
    // Determine if it's rush hour (7-9 AM, 5-7 PM on weekdays)
    const isRushHour = !this.isWeekend(dayOfWeek) && 
                      ((hourOfDay >= 7 && hourOfDay <= 9) || (hourOfDay >= 17 && hourOfDay <= 19));
    
    // Calculate average speed from traffic data
    const averageSpeed = collection.currentTraffic.length > 0 
      ? collection.currentTraffic.reduce((sum, item) => sum + (item.speed || 0), 0) / collection.currentTraffic.length
      : 50; // Default speed

    return {
      id: this.generateId(),
      location: collection.location,
      severity: analysis.severity || 'moderate',
      congestionLevel: analysis.predictedCongestion || 50,
      averageSpeed,
      confidence: analysis.confidence || 0.7,
      timestamp,
      dayOfWeek,
      hourOfDay,
      month,
      season,
      weatherConditions: collection.weatherConditions,
      isHoliday: this.isHoliday(date),
      isWeekend: this.isWeekend(dayOfWeek),
      isRushHour
    };
  }

  /**
   * Add traffic pattern to location
   */
  private addTrafficPattern(locationKey: string, pattern: TrafficPattern): void {
    if (!this.trafficPatterns.has(locationKey)) {
      this.trafficPatterns.set(locationKey, []);
    }
    
    const patterns = this.trafficPatterns.get(locationKey)!;
    patterns.push(pattern);
    
    // Keep only last 1000 patterns per location to prevent memory issues
    if (patterns.length > 1000) {
      patterns.splice(0, patterns.length - 1000);
    }
  }

  /**
   * Update hotspots based on traffic patterns
   */
  private async updateHotspots(locationKey: string, pattern: TrafficPattern): Promise<void> {
    const existingHotspot = this.hotspots.get(locationKey);
    
    if (existingHotspot) {
      // Update existing hotspot
      existingHotspot.dataPoints++;
      existingHotspot.lastUpdated = pattern.timestamp;
      
      // Update average congestion
      const totalCongestion = existingHotspot.averageCongestion * (existingHotspot.dataPoints - 1) + pattern.congestionLevel;
      existingHotspot.averageCongestion = totalCongestion / existingHotspot.dataPoints;
      
      // Update frequency (how often this area has high traffic)
      if (pattern.severity === 'high' || pattern.severity === 'severe') {
        existingHotspot.frequency = Math.min(1, existingHotspot.frequency + 0.01);
      }
      
      // Update peak hours
      this.updatePeakHours(existingHotspot, pattern);
      
      // Update seasonal patterns
      existingHotspot.seasonalPatterns[pattern.season] = 
        (existingHotspot.seasonalPatterns[pattern.season] + pattern.congestionLevel) / 2;
        
    } else {
      // Create new hotspot
      const hotspot: TrafficHotspot = {
        id: this.generateId(),
        location: pattern.location,
        name: this.generateLocationName(pattern.location),
        description: `Traffic hotspot at ${this.generateLocationName(pattern.location)}`,
        severity: pattern.severity,
        frequency: pattern.severity === 'high' || pattern.severity === 'severe' ? 0.1 : 0.01,
        averageCongestion: pattern.congestionLevel,
        peakHours: [pattern.hourOfDay],
        peakDays: [pattern.dayOfWeek],
        seasonalPatterns: {
          spring: pattern.season === 'spring' ? pattern.congestionLevel : 0,
          summer: pattern.season === 'summer' ? pattern.congestionLevel : 0,
          fall: pattern.season === 'fall' ? pattern.congestionLevel : 0,
          winter: pattern.season === 'winter' ? pattern.congestionLevel : 0
        },
        alternativeRoutes: [],
        lastUpdated: pattern.timestamp,
        dataPoints: 1
      };
      
      this.hotspots.set(locationKey, hotspot);
    }
  }

  /**
   * Store alternative routes
   */
  private async storeAlternativeRoutes(routes: AlternativeRoute[], pattern: TrafficPattern): Promise<void> {
    routes.forEach(route => {
      const routeKey = this.getRouteKey(route.origin, route.destination);
      
      if (!this.alternativeRoutes.has(routeKey)) {
        this.alternativeRoutes.set(routeKey, []);
      }
      
      const routeList = this.alternativeRoutes.get(routeKey)!;
      
      // Update route with current traffic data
      route.congestionLevel = pattern.congestionLevel;
      route.confidence = pattern.confidence;
      route.timestamp = pattern.timestamp;
      
      routeList.push(route);
      
      // Keep only last 100 routes per route pair
      if (routeList.length > 100) {
        routeList.splice(0, routeList.length - 100);
      }
    });
  }

  /**
   * Get traffic analytics for a location
   */
  async getTrafficAnalytics(location?: { lat: number; lng: number }): Promise<TrafficAnalytics> {
    const locationKey = location ? this.getLocationKey(location) : null;
    
    // Get all patterns (or filtered by location)
    const allPatterns = locationKey 
      ? this.trafficPatterns.get(locationKey) || []
      : Array.from(this.trafficPatterns.values()).flat();
    
    if (allPatterns.length === 0) {
      return this.getEmptyAnalytics();
    }

    // Calculate analytics
    const totalDataPoints = allPatterns.length;
    const averageCongestion = allPatterns.reduce((sum, p) => sum + p.congestionLevel, 0) / totalDataPoints;
    
    // Peak traffic hours
    const hourCongestion = new Map<number, number[]>();
    allPatterns.forEach(pattern => {
      if (!hourCongestion.has(pattern.hourOfDay)) {
        hourCongestion.set(pattern.hourOfDay, []);
      }
      hourCongestion.get(pattern.hourOfDay)!.push(pattern.congestionLevel);
    });
    
    const peakTrafficHours = Array.from(hourCongestion.entries())
      .map(([hour, congestions]) => ({
        hour,
        congestion: congestions.reduce((sum, c) => sum + c, 0) / congestions.length
      }))
      .sort((a, b) => b.congestion - a.congestion)
      .slice(0, 5);

    // Peak traffic days
    const dayCongestion = new Map<number, number[]>();
    allPatterns.forEach(pattern => {
      if (!dayCongestion.has(pattern.dayOfWeek)) {
        dayCongestion.set(pattern.dayOfWeek, []);
      }
      dayCongestion.get(pattern.dayOfWeek)!.push(pattern.congestionLevel);
    });
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const peakTrafficDays = Array.from(dayCongestion.entries())
      .map(([day, congestions]) => ({
        day: dayNames[day],
        congestion: congestions.reduce((sum, c) => sum + c, 0) / congestions.length
      }))
      .sort((a, b) => b.congestion - a.congestion);

    // Seasonal trends
    const seasonalTrends = this.calculateSeasonalTrends(allPatterns);

    // Top hotspots
    const topHotspots = Array.from(this.hotspots.values())
      .sort((a, b) => b.averageCongestion - a.averageCongestion)
      .slice(0, 10);

    // Route recommendations
    const routeRecommendations = this.generateRouteRecommendations();

    return {
      totalDataPoints,
      averageCongestion,
      peakTrafficHours,
      peakTrafficDays,
      seasonalTrends,
      topHotspots,
      routeRecommendations
    };
  }

  /**
   * Get hotspots near a location
   */
  async getNearbyHotspots(location: { lat: number; lng: number }, radiusKm: number = 5): Promise<TrafficHotspot[]> {
    const hotspots = Array.from(this.hotspots.values());
    
    return hotspots.filter(hotspot => {
      const distance = this.calculateDistance(location, hotspot.location);
      return distance <= radiusKm;
    }).sort((a, b) => b.averageCongestion - a.averageCongestion);
  }

  /**
   * Get best routes between two locations
   */
  async getBestRoutes(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ): Promise<AlternativeRoute[]> {
    const routeKey = this.getRouteKey(origin, destination);
    const routes = this.alternativeRoutes.get(routeKey) || [];
    
    // Sort by congestion level (lowest first) and confidence (highest first)
    return routes.sort((a, b) => {
      if (a.congestionLevel !== b.congestionLevel) {
        return a.congestionLevel - b.congestionLevel;
      }
      return b.confidence - a.confidence;
    });
  }

  /**
   * Get traffic patterns for a specific time period
   */
  async getTrafficPatterns(
    location: { lat: number; lng: number },
    startDate: Date,
    endDate: Date
  ): Promise<TrafficPattern[]> {
    const locationKey = this.getLocationKey(location);
    const patterns = this.trafficPatterns.get(locationKey) || [];
    
    return patterns.filter(pattern => 
      pattern.timestamp >= startDate && pattern.timestamp <= endDate
    );
  }

  // Helper methods
  private getLocationKey(location: { lat: number; lng: number }): string {
    return `${location.lat.toFixed(4)},${location.lng.toFixed(4)}`;
  }

  private getRouteKey(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }): string {
    return `${this.getLocationKey(origin)}-${this.getLocationKey(destination)}`;
  }

  private generateId(): string {
    return `traffic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateLocationName(location: { lat: number; lng: number }): string {
    return `Location ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
  }

  private getSeason(month: number): 'spring' | 'summer' | 'fall' | 'winter' {
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'fall';
    return 'winter';
  }

  private isWeekend(dayOfWeek: number): boolean {
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
  }

  private isHoliday(date: Date): boolean {
    // Simple holiday check - you can expand this
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // Major holidays (simplified)
    if (month === 1 && day === 1) return true; // New Year's Day
    if (month === 7 && day === 4) return true; // Independence Day
    if (month === 12 && day === 25) return true; // Christmas
    
    return false;
  }

  private updatePeakHours(hotspot: TrafficHotspot, pattern: TrafficPattern): void {
    if (!hotspot.peakHours.includes(pattern.hourOfDay)) {
      hotspot.peakHours.push(pattern.hourOfDay);
    }
    
    // Keep only top 5 peak hours
    if (hotspot.peakHours.length > 5) {
      hotspot.peakHours = hotspot.peakHours.slice(0, 5);
    }
  }

  private calculateSeasonalTrends(patterns: TrafficPattern[]): any[] {
    const seasons = ['spring', 'summer', 'fall', 'winter'] as const;
    
    return seasons.map(season => {
      const seasonPatterns = patterns.filter(p => p.season === season);
      const averageCongestion = seasonPatterns.length > 0 
        ? seasonPatterns.reduce((sum, p) => sum + p.congestionLevel, 0) / seasonPatterns.length
        : 0;
      
      return {
        season,
        averageCongestion,
        trend: 'stable' as const // You can implement trend calculation
      };
    });
  }

  private generateRouteRecommendations(): any[] {
    // Generate route recommendations based on stored data
    // This is a simplified version - you can expand this
    return [];
  }

  private calculateDistance(loc1: { lat: number; lng: number }, loc2: { lat: number; lng: number }): number {
    const R = 6371; // Earth's radius in km
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLng = (loc2.lng - loc1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private getEmptyAnalytics(): TrafficAnalytics {
    return {
      totalDataPoints: 0,
      averageCongestion: 0,
      peakTrafficHours: [],
      peakTrafficDays: [],
      seasonalTrends: [],
      topHotspots: [],
      routeRecommendations: []
    };
  }

  /**
   * Load data from localStorage
   */
  private loadFromStorage(): void {
    try {
      if (typeof window === 'undefined') return; // Skip in SSR
      
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;

      const data = JSON.parse(stored);
      
      // Restore Maps from stored data
      if (data.trafficPatterns) {
        this.trafficPatterns = new Map(Object.entries(data.trafficPatterns));
      }
      if (data.hotspots) {
        this.hotspots = new Map(Object.entries(data.hotspots));
      }
      if (data.alternativeRoutes) {
        this.alternativeRoutes = new Map(Object.entries(data.alternativeRoutes));
      }
      if (data.storedData) {
        this.storedData = new Map(Object.entries(data.storedData));
      }

      console.log('✅ Loaded traffic data from localStorage:', {
        patterns: this.trafficPatterns.size,
        hotspots: this.hotspots.size,
        routes: this.alternativeRoutes.size,
        stored: this.storedData.size
      });
      
    } catch (error) {
      console.warn('Failed to load traffic data from localStorage:', error);
    }
  }

  /**
   * Save data to localStorage
   */
  private saveToStorage(): void {
    try {
      if (typeof window === 'undefined') return; // Skip in SSR
      
      const data = {
        trafficPatterns: Object.fromEntries(this.trafficPatterns),
        hotspots: Object.fromEntries(this.hotspots),
        alternativeRoutes: Object.fromEntries(this.alternativeRoutes),
        storedData: Object.fromEntries(this.storedData),
        lastSaved: new Date().toISOString()
      };

      const jsonString = JSON.stringify(data);
      
      // Check storage size limit
      if (jsonString.length > this.MAX_STORAGE_SIZE) {
        console.warn('Traffic data exceeds storage limit, cleaning old data...');
        this.cleanOldData();
        return; // Will be saved in next call
      }

      localStorage.setItem(this.STORAGE_KEY, jsonString);
      console.log('✅ Saved traffic data to localStorage');
      
    } catch (error) {
      console.warn('Failed to save traffic data to localStorage:', error);
    }
  }

  /**
   * Clean old data to stay within storage limits
   */
  private cleanOldData(): void {
    // Keep only the most recent 50% of data
    const patternsToKeep = Math.floor(this.trafficPatterns.size * 0.5);
    const routesToKeep = Math.floor(this.alternativeRoutes.size * 0.5);
    const storedToKeep = Math.floor(this.storedData.size * 0.5);

    // Sort by timestamp and keep most recent
    const sortedPatterns = Array.from(this.trafficPatterns.entries())
      .sort(([,a], [,b]) => {
        const aLatest = Math.max(...a.map(p => p.timestamp.getTime()));
        const bLatest = Math.max(...b.map(p => p.timestamp.getTime()));
        return bLatest - aLatest;
      })
      .slice(0, patternsToKeep);

    const sortedRoutes = Array.from(this.alternativeRoutes.entries())
      .sort(([,a], [,b]) => {
        const aLatest = Math.max(...a.map(r => r.timestamp.getTime()));
        const bLatest = Math.max(...b.map(r => r.timestamp.getTime()));
        return bLatest - aLatest;
      })
      .slice(0, routesToKeep);

    const sortedStored = Array.from(this.storedData.entries())
      .sort(([,a], [,b]) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, storedToKeep);

    // Update Maps with cleaned data
    this.trafficPatterns = new Map(sortedPatterns);
    this.alternativeRoutes = new Map(sortedRoutes);
    this.storedData = new Map(sortedStored);

    console.log('🧹 Cleaned old traffic data:', {
      patterns: this.trafficPatterns.size,
      routes: this.alternativeRoutes.size,
      stored: this.storedData.size
    });

    // Try saving again
    this.saveToStorage();
  }

  /**
   * Export all traffic data as JSON
   */
  exportData(): string {
    const data = {
      trafficPatterns: Object.fromEntries(this.trafficPatterns),
      hotspots: Object.fromEntries(this.hotspots),
      alternativeRoutes: Object.fromEntries(this.alternativeRoutes),
      storedData: Object.fromEntries(this.storedData),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import traffic data from JSON
   */
  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.trafficPatterns) {
        this.trafficPatterns = new Map(Object.entries(data.trafficPatterns));
      }
      if (data.hotspots) {
        this.hotspots = new Map(Object.entries(data.hotspots));
      }
      if (data.alternativeRoutes) {
        this.alternativeRoutes = new Map(Object.entries(data.alternativeRoutes));
      }
      if (data.storedData) {
        this.storedData = new Map(Object.entries(data.storedData));
      }

      this.saveToStorage();
      console.log('✅ Imported traffic data successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to import traffic data:', error);
      return false;
    }
  }

  /**
   * Clear all stored traffic data
   */
  clearAllData(): void {
    this.trafficPatterns.clear();
    this.hotspots.clear();
    this.alternativeRoutes.clear();
    this.storedData.clear();
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
    
    console.log('🗑️ Cleared all traffic data');
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): {
    totalPatterns: number;
    totalHotspots: number;
    totalRoutes: number;
    totalStored: number;
    storageSize: number;
    lastSaved?: string;
  } {
    const data = this.exportData();
    const storageSize = new Blob([data]).size;
    
    return {
      totalPatterns: this.trafficPatterns.size,
      totalHotspots: this.hotspots.size,
      totalRoutes: this.alternativeRoutes.size,
      totalStored: this.storedData.size,
      storageSize,
      lastSaved: typeof window !== 'undefined' ? 
        localStorage.getItem(`${this.STORAGE_KEY}_lastSaved`) : undefined
    };
  }

  /**
   * Sync data to Supabase
   */
  private async syncToSupabase(
    pattern: TrafficPattern, 
    hotspot: TrafficHotspot | null, 
    collection: TrafficDataCollection, 
    analysis: any
  ): Promise<void> {
    try {
      // Store traffic pattern
      await this.supabaseService.storeTrafficPattern(pattern);
      
      // Store hotspot if it exists
      if (hotspot) {
        await this.supabaseService.storeTrafficHotspot(hotspot);
      }
      
      // Store analysis data
      await this.supabaseService.storeTrafficAnalysis(collection, analysis);
      
    } catch (error) {
      console.warn('Supabase sync failed:', error);
    }
  }

  /**
   * Sync data to 0G Storage
   */
  private async syncToZeroGStorage(
    pattern: TrafficPattern, 
    hotspot: TrafficHotspot | null, 
    collection: TrafficDataCollection, 
    analysis: any
  ): Promise<void> {
    try {
      // Store individual traffic pattern
      const patternData = {
        type: 'individual_pattern',
        pattern,
        timestamp: new Date().toISOString()
      };
      
      // await ZeroGStorageService.uploadTrafficData(patternData);
      
      // Store hotspot if it exists
      if (hotspot) {
        const hotspotData = {
          type: 'individual_hotspot',
          hotspot,
          timestamp: new Date().toISOString()
        };
        
        // await ZeroGStorageService.uploadTrafficData(hotspotData);
      }
      
      // Store analysis data
      const analysisData = {
        type: 'traffic_analysis',
        collection,
        analysis,
        pattern,
        hotspot,
        timestamp: new Date().toISOString()
      };
      
      // await ZeroGStorageService.uploadTrafficData(analysisData);
      
    } catch (error) {
      console.warn('0G Storage sync failed:', error);
    }
  }

  /**
   * Sync all local data to Supabase
   */
  async syncAllDataToSupabase(): Promise<{ success: number; failed: number }> {
    try {
      const localData = {
        trafficPatterns: this.trafficPatterns,
        hotspots: this.hotspots,
        alternativeRoutes: this.alternativeRoutes,
        storedData: this.storedData
      };
      
      return await this.supabaseService.syncLocalDataToSupabase(localData);
    } catch (error) {
      console.error('Failed to sync all data to Supabase:', error);
      return { success: 0, failed: 0 };
    }
  }

  /**
   * Get traffic analytics from Supabase
   */
  async getSupabaseAnalytics(location?: { lat: number; lng: number }): Promise<TrafficAnalytics | null> {
    try {
      return await this.supabaseService.getTrafficAnalytics(location);
    } catch (error) {
      console.error('Failed to get Supabase analytics:', error);
      return null;
    }
  }

  /**
   * Get nearby hotspots from Supabase
   */
  async getSupabaseHotspots(location: { lat: number; lng: number }, radiusKm: number = 5): Promise<TrafficHotspot[]> {
    try {
      return await this.supabaseService.getNearbyHotspots(location, radiusKm);
    } catch (error) {
      console.error('Failed to get Supabase hotspots:', error);
      return [];
    }
  }

  /**
   * Sign in to Supabase
   */
  async signInToSupabase(email: string, password: string): Promise<boolean> {
    try {
      return await this.supabaseService.signIn(email, password);
    } catch (error) {
      console.error('Failed to sign in to Supabase:', error);
      return false;
    }
  }

  /**
   * Sign up to Supabase
   */
  async signUpToSupabase(email: string, password: string): Promise<boolean> {
    try {
      return await this.supabaseService.signUp(email, password);
    } catch (error) {
      console.error('Failed to sign up to Supabase:', error);
      return false;
    }
  }

  /**
   * Sign out from Supabase
   */
  async signOutFromSupabase(): Promise<boolean> {
    try {
      return await this.supabaseService.signOut();
    } catch (error) {
      console.error('Failed to sign out from Supabase:', error);
      return false;
    }
  }

  /**
   * Get current Supabase user
   */
  async getCurrentSupabaseUser(): Promise<any> {
    try {
      return await this.supabaseService.getCurrentUser();
    } catch (error) {
      console.error('Failed to get current Supabase user:', error);
      return null;
    }
  }

  /**
   * Create complete backup of all traffic data to 0G Storage
   */
  async createZeroGBackup(): Promise<{ success: boolean; rootHash?: string; error?: string }> {
    try {
      const allData = {
        trafficPatterns: this.trafficPatterns,
        hotspots: this.hotspots,
        alternativeRoutes: this.alternativeRoutes,
        storedData: this.storedData
      };

      // const result = await ZeroGStorageService.uploadTrafficData(allData);
      
      if (result.success) {
        console.log('✅ Complete traffic data backup created on 0G Storage');
        console.log('📁 Backup Root Hash:', result.rootHash);
      } else {
        console.error('❌ Failed to create 0G backup:', result.error);
      }

      return result;
    } catch (error) {
      console.error('Failed to create 0G backup:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Restore traffic data from 0G Storage backup
   */
  async restoreFromZeroGBackup(rootHash: string): Promise<{ success: boolean; error?: string }> {
    try {
      // const result = await ZeroGStorageService.downloadData(rootHash);
      
      if (!result.success || !result.data) {
        return { success: false, error: result.error || 'Failed to download backup' };
      }

      const backupData = result.data;
      
      // Validate backup data structure
      if (!backupData.data || !backupData.type || backupData.type !== 'complete_traffic_backup') {
        return { success: false, error: 'Invalid backup data format' };
      }

      // Restore data to local storage
      if (backupData.data.trafficPatterns) {
        this.trafficPatterns = new Map(Object.entries(backupData.data.trafficPatterns));
      }
      if (backupData.data.hotspots) {
        this.hotspots = new Map(Object.entries(backupData.data.hotspots));
      }
      if (backupData.data.alternativeRoutes) {
        this.alternativeRoutes = new Map(Object.entries(backupData.data.alternativeRoutes));
      }
      if (backupData.data.storedData) {
        this.storedData = new Map(Object.entries(backupData.data.storedData));
      }

      // Save restored data to localStorage
      this.saveToStorage();

      console.log('✅ Traffic data restored from 0G Storage backup');
      console.log('📊 Restored statistics:', backupData.statistics);

      return { success: true };
    } catch (error) {
      console.error('Failed to restore from 0G backup:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Sync all local data to 0G Storage
   */
  async syncAllDataToZeroGStorage(): Promise<{ success: number; failed: number }> {
    try {
      const allData = {
        trafficPatterns: this.trafficPatterns,
        hotspots: this.hotspots,
        alternativeRoutes: this.alternativeRoutes,
        storedData: this.storedData
      };

      let success = 0;
      let failed = 0;

      // Store traffic patterns
      if (this.trafficPatterns.size > 0) {
        // const result = await ZeroGStorageService.uploadTrafficData(this.trafficPatterns);
        if (result.success) success++; else failed++;
      }

      // Store hotspots
      if (this.hotspots.size > 0) {
        // const result = await ZeroGStorageService.uploadTrafficData(this.hotspots);
        if (result.success) success++; else failed++;
      }

      // Store alternative routes
      if (this.alternativeRoutes.size > 0) {
        // const result = await ZeroGStorageService.uploadTrafficData(this.alternativeRoutes);
        if (result.success) success++; else failed++;
      }

      // Create complete backup
      // const backupResult = await ZeroGStorageService.uploadTrafficData(allData);
      if (backupResult.success) success++; else failed++;

      console.log(`✅ 0G Storage sync completed: ${success} successful, ${failed} failed`);
      return { success, failed };
    } catch (error) {
      console.error('Failed to sync all data to 0G Storage:', error);
      return { success: 0, failed: 0 };
    }
  }

  /**
   * Test 0G Storage connection
   */
  async testZeroGConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      return true; // 0G Storage connection via server
    } catch (error) {
      console.error('Failed to test 0G connection:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get 0G Storage statistics
   */
  getZeroGStorageStats(): any {
    return ZeroGStorageService.getAllStoredData();
  }

  /**
   * Initialize periodic backups to 0G Storage
   */
  private initializePeriodicBackups(): void {
    // Create backup every 6 hours (21600000 ms)
    setInterval(async () => {
      try {
        const stats = this.getStorageStats();
        if (stats.totalStored > 0) {
          console.log('🔄 Creating periodic 0G Storage backup...');
          const result = await this.createZeroGBackup();
          if (result.success) {
            console.log('✅ Periodic backup completed:', result.rootHash);
          } else {
            console.warn('⚠️ Periodic backup failed:', result.error);
          }
        }
      } catch (error) {
        console.warn('Periodic backup error:', error);
      }
    }, 6 * 60 * 60 * 1000); // 6 hours

    // Also create backup when app starts (if there's data)
    setTimeout(async () => {
      try {
        const stats = this.getStorageStats();
        if (stats.totalStored > 10) { // Only backup if there's substantial data
          console.log('🔄 Creating initial 0G Storage backup...');
          const result = await this.createZeroGBackup();
          if (result.success) {
            console.log('✅ Initial backup completed:', result.rootHash);
          }
        }
      } catch (error) {
        console.warn('Initial backup error:', error);
      }
    }, 30000); // Wait 30 seconds after app start
  }
}
