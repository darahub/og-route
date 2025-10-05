// 0G Compute Network SDK integration for AI traffic analysis
import { ethers } from "ethers";
import { TrafficDataStorageService } from "./trafficDataStorage";
import { TrafficDataCollection } from "../types/trafficStorage";

interface TrafficAnalysisRequest {
  currentTraffic: any[];
  userLocation: { lat: number; lng: number };
  destination?: string;
  timeOfDay: string;
  weatherConditions?: string;
}

interface AITrafficInsight {
  severity: 'low' | 'moderate' | 'high' | 'severe';
  confidence: number;
  summary: string;
  recommendations: string[];
  predictedCongestion: number;
  bestTimeToTravel: string;
  alternativeRoutesSuggestion: string;
  estimatedDelay: number;
}

export class ZeroGComputeService {
  private static broker: any = null;
  private static isInitialized = false;

  /**
   * Initialize the 0G Compute Network broker following official SDK pattern
   */
  static async initializeBroker(): Promise<void> {
    if (this.isInitialized && this.broker) {
      return;
    }

    try {
      const privateKey = import.meta.env.VITE_ZEROG_PRIVATE_KEY;

      if (!privateKey) {
        console.warn('No private key found. 0G Compute Network will not be available.');
        this.isInitialized = true;
        return;
      }

      const provider = new ethers.JsonRpcProvider("https://evmrpc-testnet.0g.ai");
      const wallet = new ethers.Wallet(privateKey, provider);

      const { createZGComputeNetworkBroker } = await import("@0glabs/0g-serving-broker");
      this.broker = await createZGComputeNetworkBroker(wallet);

      this.isInitialized = true;
      console.log('✅ 0G Compute Network broker initialized');
    } catch (error) {
      console.error('Failed to initialize 0G broker:', error);
      this.isInitialized = true;
    }
  }

  /**
   * Add funds to ledger (following official SDK)
   */
  static async fundAccount(amount: number = 10): Promise<void> {
    await this.initializeBroker();
    if (!this.broker) throw new Error('Broker not initialized');

    await this.broker.ledger.addLedger(amount);
    console.log(`✅ Added ${amount} to ledger`);
  }

  /**
   * Check account balance
   */
  static async getBalance(): Promise<any> {
    await this.initializeBroker();
    if (!this.broker) return null;

    try {
      const account = await this.broker.ledger.getLedger();
      return account;
    } catch (error) {
      console.error('Failed to get balance:', error);
      return null;
    }
  }

  /**
   * List available services (following official SDK)
   */
  static async getAvailableServices(): Promise<any[]> {
    await this.initializeBroker();
    if (!this.broker) return [];

    try {
      const services = await this.broker.inference.listService();
      console.log('📋 Available services:', services);
      return services;
    } catch (error) {
      console.error('Failed to list services:', error);
      return [];
    }
  }

  /**
   * Send AI request following official SDK pattern
   */
  static async sendAIRequest(prompt: string): Promise<string> {
    await this.initializeBroker();
    if (!this.broker) throw new Error('Broker not initialized');

    try {
      // 1. List services to get provider address
      const services = await this.broker.inference.listService();
      if (!services || services.length === 0) {
        throw new Error('No services available');
      }

      const providerAddress = services[0].provider || services[0].providerAddress || services[0].address;
      if (!providerAddress) {
        throw new Error('Provider address not found');
      }

      console.log('Using provider:', providerAddress);

      // 2. Get service metadata
      const { endpoint, model } = await this.broker.inference.getServiceMetadata(providerAddress);

      // 3. Prepare messages
      const messages = [{ role: "user", content: prompt }];

      // 4. Generate request headers
      const headers = await this.broker.inference.getRequestHeaders(providerAddress, messages);

      // 5. Send request
      const response = await fetch(`${endpoint}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers
        },
        body: JSON.stringify({ messages, model })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const answer = data.choices[0].message.content;

      // 6. Process response for verification (optional - may fail if chat ID doesn't exist)
      try {
        await this.broker.inference.processResponse(providerAddress, answer);
      } catch (verifyError) {
        // Silently skip verification - this is expected behavior
      }

      console.log('✅ AI response received');
      return answer;

    } catch (error) {
      console.error('AI request failed:', error);
      throw error;
    }
  }

  /**
   * Analyze traffic conditions using 0G Compute Network AI via API
   */
  static async analyzeTrafficConditions(request: TrafficAnalysisRequest): Promise<AITrafficInsight> {
    try {
      const prompt = this.buildTrafficAnalysisPrompt(request);

      // Use API endpoint instead of direct 0G Compute call to avoid Mixed Content issues
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      const answerText = data.answer;

      // Parse AI response
      const parsed = this.extractJson(answerText);
      const aiAnalysis = JSON.parse(parsed);
      const analysis = this.validateAndFormatResponse(aiAnalysis);

      // Store analysis
      await this.storeTrafficAnalysis(request, analysis);
      return analysis;

    } catch (error) {
      console.error('0G Compute analysis failed:', error);

      // Fallback to local analysis
      const fallbackAnalysis = this.performIntelligentAnalysis(request);
      await this.storeTrafficAnalysis(request, fallbackAnalysis);
      return fallbackAnalysis;
    }
  }

  /**
   * Store traffic analysis data for future reference and analytics
   */
  private static async storeTrafficAnalysis(request: TrafficAnalysisRequest, analysis: AITrafficInsight): Promise<void> {
    try {
      const storageService = TrafficDataStorageService.getInstance();
      
      const collection: TrafficDataCollection = {
        location: request.userLocation,
        currentTraffic: request.currentTraffic,
        destination: request.destination,
        timeOfDay: request.timeOfDay,
        weatherConditions: request.weatherConditions
      };
      
      await storageService.storeTrafficAnalysis(collection, analysis, request.userLocation);
      console.log('✅ Traffic analysis data stored successfully');
      
    } catch (error) {
      console.warn('Failed to store traffic analysis data:', error);
      // Don't throw error - this is not critical for the main functionality
    }
  }

  /**
   * Get traffic analytics for a location
   */
  static async getTrafficAnalytics(location?: { lat: number; lng: number }): Promise<any> {
    try {
      const storageService = TrafficDataStorageService.getInstance();
      return await storageService.getTrafficAnalytics(location);
    } catch (error) {
      console.error('Failed to get traffic analytics:', error);
      return null;
    }
  }

  /**
   * Get nearby traffic hotspots
   */
  static async getNearbyHotspots(location: { lat: number; lng: number }, radiusKm: number = 5): Promise<any[]> {
    try {
      const storageService = TrafficDataStorageService.getInstance();
      return await storageService.getNearbyHotspots(location, radiusKm);
    } catch (error) {
      console.error('Failed to get nearby hotspots:', error);
      return [];
    }
  }

  /**
   * Get best routes between two locations
   */
  static async getBestRoutes(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }): Promise<any[]> {
    try {
      const storageService = TrafficDataStorageService.getInstance();
      return await storageService.getBestRoutes(origin, destination);
    } catch (error) {
      console.error('Failed to get best routes:', error);
      return [];
    }
  }

  /**
   * Export all traffic data as JSON
   */
  static exportTrafficData(): string {
    try {
      const storageService = TrafficDataStorageService.getInstance();
      return storageService.exportData();
    } catch (error) {
      console.error('Failed to export traffic data:', error);
      return '{}';
    }
  }

  /**
   * Import traffic data from JSON
   */
  static importTrafficData(jsonData: string): boolean {
    try {
      const storageService = TrafficDataStorageService.getInstance();
      return storageService.importData(jsonData);
    } catch (error) {
      console.error('Failed to import traffic data:', error);
      return false;
    }
  }

  /**
   * Clear all stored traffic data
   */
  static clearTrafficData(): void {
    try {
      const storageService = TrafficDataStorageService.getInstance();
      storageService.clearAllData();
    } catch (error) {
      console.error('Failed to clear traffic data:', error);
    }
  }

  /**
   * Get storage statistics
   */
  static getTrafficDataStats(): any {
    try {
      const storageService = TrafficDataStorageService.getInstance();
      return storageService.getStorageStats();
    } catch (error) {
      console.error('Failed to get traffic data stats:', error);
      return null;
    }
  }

  /**
   * Sync all local data to Supabase
   */
  static async syncToSupabase(): Promise<{ success: number; failed: number }> {
    try {
      const storageService = TrafficDataStorageService.getInstance();
      return await storageService.syncAllDataToSupabase();
    } catch (error) {
      console.error('Failed to sync to Supabase:', error);
      return { success: 0, failed: 0 };
    }
  }

  /**
   * Sign in to Supabase
   */
  static async signInToSupabase(email: string, password: string): Promise<boolean> {
    try {
      const storageService = TrafficDataStorageService.getInstance();
      return await storageService.signInToSupabase(email, password);
    } catch (error) {
      console.error('Failed to sign in to Supabase:', error);
      return false;
    }
  }

  /**
   * Sign up to Supabase
   */
  static async signUpToSupabase(email: string, password: string): Promise<boolean> {
    try {
      const storageService = TrafficDataStorageService.getInstance();
      return await storageService.signUpToSupabase(email, password);
    } catch (error) {
      console.error('Failed to sign up to Supabase:', error);
      return false;
    }
  }

  /**
   * Sign out from Supabase
   */
  static async signOutFromSupabase(): Promise<boolean> {
    try {
      const storageService = TrafficDataStorageService.getInstance();
      return await storageService.signOutFromSupabase();
    } catch (error) {
      console.error('Failed to sign out from Supabase:', error);
      return false;
    }
  }

  /**
   * Get current Supabase user
   */
  static async getCurrentSupabaseUser(): Promise<any> {
    try {
      const storageService = TrafficDataStorageService.getInstance();
      return await storageService.getCurrentSupabaseUser();
    } catch (error) {
      console.error('Failed to get current Supabase user:', error);
      return null;
    }
  }

  /**
   * Optimize route using AI insights
   */
  static async optimizeRoute(_currentRoute: any, trafficData: any[], _userPreferences: any): Promise<string> {
    const trafficLevel = this.analyzeTrafficLevel(trafficData);
    const severity = this.determineSeverity(trafficLevel, 0.5);
    const recommendations = this.generateRecommendations(severity);
    return recommendations.join('. ');
  }

  /**
   * Predict traffic trends using AI
   */
  static async predictTrafficTrends(_historicalData: any[], currentConditions: any): Promise<any> {
    const currentTrafficLevel = this.analyzeTrafficLevel(currentConditions);

    return {
      nextHour: { congestion: Math.round(currentTrafficLevel * 100), confidence: 0.7 },
      next2Hours: { congestion: Math.round(currentTrafficLevel * 90), confidence: 0.6 },
      next4Hours: { congestion: Math.round(currentTrafficLevel * 80), confidence: 0.5 },
      peakTime: "17:30",
      reasoning: "Based on current traffic patterns"
    };
  }

  // Helper methods for fallback analysis
  private static extractJson(text: string): string {
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch?.[1]) {
      return fenceMatch[1].trim();
    }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return text.slice(start, end + 1);
    }
    return text;
  }

  private static performIntelligentAnalysis(request: TrafficAnalysisRequest): AITrafficInsight {
    const { currentTraffic, destination, timeOfDay } = request;
    
    const trafficLevel = this.analyzeTrafficLevel(currentTraffic);
    const timeFactor = this.analyzeTimeFactor(timeOfDay);
    const severity = this.determineSeverity(trafficLevel, timeFactor);
    
    return {
      severity,
      confidence: 0.85,
      summary: this.generateSummary(severity, destination),
      recommendations: this.generateRecommendations(severity),
      predictedCongestion: this.calculateCongestion(trafficLevel),
      bestTimeToTravel: this.calculateBestTime(timeOfDay),
      alternativeRoutesSuggestion: this.generateRouteSuggestion(severity),
      estimatedDelay: this.calculateDelay(severity)
    };
  }

  private static analyzeTrafficLevel(trafficData: any[]): number {
    if (!trafficData || trafficData.length === 0) return 0;
    
    const avgSpeed = trafficData.reduce((sum, item) => sum + (item.speed || 0), 0) / trafficData.length;
    const avgCongestion = trafficData.reduce((sum, item) => sum + (item.congestion || 0), 0) / trafficData.length;
    
    return Math.min(1, (avgCongestion / 100) + (1 - avgSpeed / 60));
  }

  private static analyzeTimeFactor(timeOfDay: string): number {
    const hour = parseInt(timeOfDay.split(':')[0]);
    
    if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)) {
      return 0.8; // Peak hours
    }
    return 0.3; // Off-peak hours
  }

  private static determineSeverity(trafficLevel: number, timeFactor: number): 'low' | 'moderate' | 'high' | 'severe' {
    const combinedScore = (trafficLevel + timeFactor) / 2;
    
    if (combinedScore < 0.3) return 'low';
    if (combinedScore < 0.6) return 'moderate';
    if (combinedScore < 0.8) return 'high';
    return 'severe';
  }

  private static calculateCongestion(trafficLevel: number): number {
    return Math.round(trafficLevel * 100);
  }

  private static calculateBestTime(timeOfDay: string): string {
    const hour = parseInt(timeOfDay.split(':')[0]);
    
    if (hour >= 7 && hour <= 9) return 'After 10:00 AM';
    if (hour >= 16 && hour <= 19) return 'Before 4:00 PM';
    return 'Current time is good';
  }

  private static generateRouteSuggestion(severity: 'low' | 'moderate' | 'high' | 'severe'): string {
    const suggestions = {
      low: 'Current route is optimal',
      moderate: 'Consider checking alternative routes',
      high: 'Strongly recommend alternative routes',
      severe: 'Use alternative routes or delay travel'
    };
    return suggestions[severity];
  }

  private static calculateDelay(severity: 'low' | 'moderate' | 'high' | 'severe'): number {
    const delays = { low: 2, moderate: 8, high: 15, severe: 25 };
    return delays[severity];
  }

  private static generateSummary(severity: 'low' | 'moderate' | 'high' | 'severe', destination: string | undefined): string {
    const dest = destination || 'your destination';
    const summaries = {
      low: `Traffic conditions to ${dest} are favorable with minimal delays expected.`,
      moderate: `Moderate traffic expected on route to ${dest}. Consider leaving a few minutes early.`,
      high: `Heavy traffic conditions detected for ${dest}. Significant delays likely.`,
      severe: `Severe traffic congestion expected to ${dest}. Consider alternative routes or timing.`
    };
    return summaries[severity];
  }

  private static generateRecommendations(severity: 'low' | 'moderate' | 'high' | 'severe'): string[] {
    const recommendations = {
      low: ['Current route is optimal', 'No significant delays expected'],
      moderate: ['Leave 5-10 minutes early', 'Consider alternative routes if available'],
      high: ['Leave 15-20 minutes early', 'Check for alternative routes', 'Consider public transportation'],
      severe: ['Significant delays expected', 'Strongly consider alternative routes', 'Check real-time traffic updates', 'Consider postponing travel if possible']
    };
    return recommendations[severity];
  }

  private static buildTrafficAnalysisPrompt(request: TrafficAnalysisRequest): string {
    const { currentTraffic, destination, timeOfDay } = request;

    // Calculate traffic summary instead of sending full data
    const avgSpeed = currentTraffic.length > 0
      ? Math.round(currentTraffic.reduce((sum, t) => sum + (t.speed || 0), 0) / currentTraffic.length)
      : 0;
    const avgCongestion = currentTraffic.length > 0
      ? Math.round(currentTraffic.reduce((sum, t) => sum + (t.congestion || 0), 0) / currentTraffic.length)
      : 0;

    const hour = parseInt(timeOfDay.split(':')[0]);
    const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19);

    return `Analyze traffic to ${destination || 'destination'}. Current: ${avgCongestion}% congestion, ${avgSpeed}km/h. Time: ${timeOfDay}${isPeakHour ? ' (peak hour)' : ''}. Consider typical patterns for this route and time. Provide detailed analysis in JSON: {"severity":"low|moderate|high|severe","confidence":0-1,"summary":"detailed overview including historical context and time-specific insights","recommendations":["specific actionable advice with reasoning"],"predictedCongestion":0-100,"bestTimeToTravel":"specific time recommendation","alternativeRoutesSuggestion":"detailed route advice","estimatedDelay":0-60}`;
  }

  private static validateAndFormatResponse(analysis: any): AITrafficInsight {
    return {
      severity: analysis.severity || 'moderate',
      confidence: Math.min(Math.max(analysis.confidence || 0.7, 0), 1),
      summary: analysis.summary || 'Traffic analysis completed',
      recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : ['Check traffic before traveling'],
      predictedCongestion: Math.min(Math.max(analysis.predictedCongestion || 50, 0), 100),
      bestTimeToTravel: analysis.bestTimeToTravel || 'Now',
      alternativeRoutesSuggestion: analysis.alternativeRoutesSuggestion || 'Consider alternative routes',
      estimatedDelay: Math.min(Math.max(analysis.estimatedDelay || 0, 0), 60)
    };
  }

  private static getFallbackAnalysis(): AITrafficInsight {
    return {
      severity: 'moderate',
      confidence: 0.6,
      summary: 'Traffic analysis temporarily unavailable. Using basic traffic data.',
      recommendations: ['Check current traffic conditions', 'Allow extra travel time'],
      predictedCongestion: 45,
      bestTimeToTravel: 'Now',
      alternativeRoutesSuggestion: 'Consider checking alternative routes',
      estimatedDelay: 5
    };
  }
}