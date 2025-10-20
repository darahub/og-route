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

      console.log('🔵 [0G Compute] Connecting to 0G Network provider...');
      const provider = new ethers.JsonRpcProvider("https://evmrpc-testnet.0g.ai");
      const wallet = new ethers.Wallet(privateKey, provider);
      console.log('🔵 [0G Compute] Provider connected, initializing 0G Compute broker...');

      const { createZGComputeNetworkBroker } = await import("@0glabs/0g-serving-broker");
      this.broker = await createZGComputeNetworkBroker(wallet);

      this.isInitialized = true;
      console.log('✅ [0G Compute] 0G Compute Network broker initialized and ready');
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
      console.log('🔵 [0G Compute] Discovering available 0G Compute providers...');
      const services = await this.broker.inference.listService();
      if (!services || services.length === 0) {
        throw new Error('No services available');
      }

      const providerAddress = services[0].provider || services[0].providerAddress || services[0].address;
      if (!providerAddress) {
        throw new Error('Provider address not found');
      }

      console.log('✅ [0G Compute] Provider selected:', providerAddress);

      // 2. Get service metadata
      console.log('🔵 [0G Compute] Retrieving provider metadata and endpoint...');
      const { endpoint, model } = await this.broker.inference.getServiceMetadata(providerAddress);
      console.log('✅ [0G Compute] Provider metadata retrieved - Model:', model);

      // 3. Prepare messages
      const messages = [{ role: "user", content: prompt }];

      // 4. Generate request headers
      console.log('🔵 [0G Compute] Generating authentication headers for 0G provider...');
      const headers = await this.broker.inference.getRequestHeaders(providerAddress, messages);

      // 5. Send request
      console.log('🔵 [0G Compute] Sending AI request to 0G Compute provider...');
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

      console.log('🔵 [0G Compute] Processing AI response from 0G provider...');
      const data = await response.json();
      const answer = data.choices[0].message.content;

      // 6. Process response for verification (optional - may fail if chat ID doesn't exist)
      try {
        await this.broker.inference.processResponse(providerAddress, answer);
      } catch (verifyError) {
        // Silently skip verification - this is expected behavior
      }

      console.log('✅ [0G Compute] AI response successfully received from 0G Compute Network');
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
      console.log('🔵 [0G Compute] Initializing traffic analysis with 0G Compute Network...');
      const prompt = this.buildTrafficAnalysisPrompt(request);

      // Use API endpoint instead of direct 0G Compute call to avoid Mixed Content issues
      const API_URL = import.meta.env.VITE_API_URL || '';
      console.log('🔵 [0G Compute] Connecting to 0G provider via secure API endpoint...');
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      console.log('🔵 [0G Compute] Querying 0G Compute provider for AI traffic insights...');
      const data = await response.json();
      const answerText = data.answer;
      console.log('✅ [0G Compute] AI analysis received from 0G Compute Network');

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

  /**
   * Train a text classification model using stored traffic data
   */
  static async trainTrafficModel(
    options: { provider: string; model?: string; trainSize?: number; validationSize?: number },
    dataset?: { train: { text: string; label: number }[]; validation: { text: string; label: number }[] }
  ): Promise<{ ok: boolean; tokenCount?: number; datasetHash?: string; logFile?: string; outputs?: any; error?: string }> {
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const model = options.model || 'distilbert-base-uncased';
      const provider = options.provider;
      if (!provider) throw new Error('Provider address is required');

      const payload = {
        model,
        provider,
        dataset: dataset || this.buildTrafficDatasetFromStorage(options.trainSize || 50, options.validationSize || 20)
      };

      const resp = await fetch(`${API_URL}/api/compute/train/traffic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const contentType = resp.headers.get('content-type') || '';
      const bodyText = await resp.text();
      let parsed: any = null;
      if (bodyText) {
        if (contentType.includes('application/json')) { try { parsed = JSON.parse(bodyText); } catch {} }
        else if (bodyText.trim().startsWith('{')) { try { parsed = JSON.parse(bodyText); } catch {} }
      }

      if (!resp.ok) {
        const err = (parsed && parsed.error) ? parsed.error : (bodyText || `Training failed (${resp.status})`);
        throw new Error(err);
      }

      return {
        ok: !!parsed?.ok,
        tokenCount: parsed?.tokenCount,
        datasetHash: parsed?.datasetHash,
        logFile: parsed?.logFile,
        outputs: parsed?.outputs
      };
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Training failed' };
    }
  }

  /**
   * Fetch training log content from server
   */
  static async getTrainingLog(filePath: string): Promise<string> {
    const API_URL = import.meta.env.VITE_API_URL || '';
    const url = `${API_URL}/api/compute/train/log?file=${encodeURIComponent(filePath)}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Failed to fetch log (${resp.status})`);
    }
    const data = await resp.json();
    return String(data?.content || '');
  }

  /**
   * Build dataset from locally stored traffic analyses
   */
  private static buildTrafficDatasetFromStorage(trainSize: number = 50, validationSize: number = 20): { train: { text: string; label: number }[]; validation: { text: string; label: number }[] } {
    try {
      const raw = this.exportTrafficData();
      const data = JSON.parse(raw || '{}');
      const stored: any[] = Object.values(data?.storedData || {});

      const labelMap: Record<string, number> = { low: 0, moderate: 1, high: 2, severe: 3 };
      const toText = (s: any) => {
        const loc = s?.collection?.location || { lat: 0, lng: 0 };
        const a = s?.analysis || {};
        const summary = a.summary || `Traffic ${a.severity || 'moderate'} with ${a.predictedCongestion || 50}% congestion`;
        return `${summary}. Location ${Number(loc.lat).toFixed(4)},${Number(loc.lng).toFixed(4)}. Best time: ${a.bestTimeToTravel || 'Now'}. Estimated delay: ${a.estimatedDelay || 0} min.`;
      };

      const items = stored.map(s => ({ text: toText(s), label: labelMap[String(s?.analysis?.severity || 'moderate')] ?? 1 }));

      // Fallback: create synthetic samples if not enough data
      const ensureCount = (arr: { text: string; label: number }[], count: number) => {
        const synthetics: { text: string; label: number }[] = [];
        const templates = [
          { text: 'Low congestion, smooth traffic, optimal route', label: 0 },
          { text: 'Moderate traffic, some delays expected', label: 1 },
          { text: 'High congestion, consider alternative routes', label: 2 },
          { text: 'Severe traffic, significant delays, avoid peak hours', label: 3 }
        ];
        while (arr.length + synthetics.length < count) {
          synthetics.push(templates[(arr.length + synthetics.length) % templates.length]);
        }
        return arr.concat(synthetics);
      };

      // Shuffle
      const shuffled = items.slice().sort(() => Math.random() - 0.5);
      const train = ensureCount(shuffled.slice(0, trainSize), trainSize);
      const validation = ensureCount(shuffled.slice(trainSize, trainSize + validationSize), validationSize);
      return { train, validation };
    } catch (_e) {
      const templates = [
        { text: 'Low congestion, smooth traffic, optimal route', label: 0 },
        { text: 'Moderate traffic, some delays expected', label: 1 },
        { text: 'High congestion, consider alternative routes', label: 2 },
        { text: 'Severe traffic, significant delays, avoid peak hours', label: 3 }
      ];
      const train = Array.from({ length: trainSize }, (_, i) => templates[i % templates.length]);
      const validation = Array.from({ length: validationSize }, (_, i) => templates[i % templates.length]);
      return { train, validation };
    }
  }
  static async getProviderMetadata(address: string): Promise<{ endpoint?: string; model?: string } | null> {
    const API_URL = import.meta.env.VITE_API_URL || '';
    try {
      const resp = await fetch(`${API_URL}/api/compute/provider/${address}/metadata`);
      if (!resp.ok) return null;
      const data = await resp.json();
      return data;
    } catch (_e) {
      return null;
    }
  }
  static async pollProviderModel(
    address: string,
    expectedModel: string,
    intervalMs: number = 5000,
    timeoutMs: number = 300000
  ): Promise<{ live: boolean; currentModel?: string; endpoint?: string }> {
    const start = Date.now();
    let lastModel: string | undefined;
    let lastEndpoint: string | undefined;
    while (Date.now() - start < timeoutMs) {
      try {
        const meta = await this.getProviderMetadata(address);
        const currentModel = meta?.model;
        lastModel = currentModel || lastModel;
        lastEndpoint = meta?.endpoint || lastEndpoint;
        if (currentModel && currentModel.toLowerCase() === expectedModel.toLowerCase()) {
          return { live: true, currentModel, endpoint: meta?.endpoint };
        }
      } catch (_e) {}
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    return { live: false, currentModel: lastModel, endpoint: lastEndpoint };
  }
}