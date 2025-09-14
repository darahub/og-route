// 0G Compute Network SDK integration for AI traffic analysis
import { ethers } from "ethers";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
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

// Dynamic provider discovery - will be populated from 0G Compute Network
let AVAILABLE_PROVIDERS: { [key: string]: string } = {};

export class ZeroGComputeService {
  private static broker: any = null;
  private static isInitialized = false;
  private static lastProviderDiscovery = 0;
  private static PROVIDER_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize the 0G Compute Network broker
   * Prioritizes private key authentication for server-side applications
   */
  static async initializeBroker(): Promise<void> {
    if (this.isInitialized && this.broker) {
      return;
    }

    try {
      // Check if we're in a browser environment and handle gracefully
      if (typeof window !== 'undefined' && typeof process === 'undefined') {
        console.warn('0G Compute Network is not available in browser environment. Using fallback mode.');
        this.isInitialized = true;
        return;
      }

      // Additional check: if process exists but has browser flag, we're in browser
      if (typeof process !== 'undefined' && process.browser) {
        console.warn('0G Compute Network is not available in browser environment. Using fallback mode.');
        this.isInitialized = true;
        return;
      }

      // Always use private key for server-side applications
      console.log('Initializing 0G broker with private key...');
      const provider = new ethers.JsonRpcProvider("https://evmrpc-testnet.0g.ai");
      
      // Get private key from environment variables
      // In Vite, environment variables are accessed via import.meta.env
      const privateKey = import.meta.env.VITE_ZEROG_PRIVATE_KEY || 
                        import.meta.env.VITE_PRIVATE_KEY || 
                        import.meta.env.VITE_ZEROG_PRIVATE_KEY;
      
      if (!privateKey) {
        console.warn('No private key found in environment variables. 0G Compute Network will not be available.');
        this.isInitialized = true;
        return;
      }
      
      const wallet = new ethers.Wallet(privateKey, provider);
      console.log('Wallet address:', wallet.address);
      
      // Check wallet balance
      const walletBalance = await provider.getBalance(wallet.address);
      const minBalance = ethers.parseEther("0.001");
      if (walletBalance < minBalance) {
        console.warn('⚠️ Wallet has low ETH balance. This might cause signature issues.');
      }
      
        this.broker = await createZGComputeNetworkBroker(wallet);
      
      this.isInitialized = true;
      console.log('0G Compute Network broker initialized successfully with private key');
    } catch (error) {
      console.error('Failed to initialize 0G broker:', error);
      console.warn('0G Compute Network will not be available. Using fallback mode.');
      this.isInitialized = true;
      // Don't throw error - allow app to continue with fallback functionality
    }
  }

  /**
   * Fund the account with OG tokens for inference services
   */
  static async fundAccount(amount: string = "0.1"): Promise<void> {
    await this.initializeBroker();
    
    try {
      const amountInWei = ethers.parseEther(amount);
        await this.broker.ledger.addLedger(amountInWei.toString());
      console.log(`Account funded with ${amount} OG tokens`);
    } catch (error) {
      console.error('Failed to fund account:', error);
      throw error;
    }
  }

  /**
   * Check account balance
   */
  static async getBalance(): Promise<string> {
    await this.initializeBroker();
    
    try {
      const account = await this.broker.ledger.getLedger();
      
      // Handle null/undefined balance values
      if (!account || account.totalbalance === null || account.totalbalance === undefined) {
        console.log('Account balance is null/undefined, returning 0');
        return "0";
      }
      
      // Ensure the balance is a valid BigNumberish value
      const balance = account.totalbalance.toString();
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get balance:', error);
      return "0";
    }
  }

  /**
   * Discover available AI services on the 0G Compute Network
   * Uses the correct API: broker.inference.listService()
   */
  static async getAvailableServices(): Promise<any[]> {
    await this.initializeBroker();
    
    try {
      const services = await this.broker.inference.listService();
      console.log('Available services:', services);
      return services;
    } catch (error) {
      console.error('Failed to get available services:', error);
      return [];
    }
  }

  /**
   * Discover and cache available providers from 0G Compute Network
   */
  static async discoverProviders(forceRefresh = false): Promise<{ [key: string]: string }> {
    const now = Date.now();
    
    // Use cached providers if still fresh and not forcing refresh
    if (!forceRefresh && 
        Object.keys(AVAILABLE_PROVIDERS).length > 0 && 
        (now - this.lastProviderDiscovery) < this.PROVIDER_CACHE_DURATION) {
      console.log('Using cached providers:', AVAILABLE_PROVIDERS);
      return AVAILABLE_PROVIDERS;
    }
    
    await this.initializeBroker();
    
    try {
      console.log('Discovering available providers...');
      const services = await this.getAvailableServices();
      
      // Clear existing providers
      AVAILABLE_PROVIDERS = {};
      
      console.log('Raw services data:', services);
      console.log('Services type:', typeof services);
      console.log('Services length:', Array.isArray(services) ? services.length : 'Not an array');
      
      // Handle different service data structures
      if (Array.isArray(services)) {
        services.forEach((service: any, index: number) => {
          console.log(`Service ${index}:`, service);
          
          // Try different property names for provider and name
          const provider = (service as any)?.provider || (service as any)?.providerAddress || (service as any)?.address;
          const name = (service as any)?.name || (service as any)?.model || (service as any)?.serviceName || `service-${index}`;
          
          if (provider && name) {
            AVAILABLE_PROVIDERS[name] = provider;
            console.log(`✅ Found provider: ${name} -> ${provider}`);
          } else {
            console.log(`❌ Service ${index} missing provider or name:`, { provider, name });
          }
        });
      } else if (services && typeof services === 'object') {
        // Handle object structure
        Object.keys(services).forEach((key) => {
          const service = (services as any)[key];
          console.log(`Service key ${key}:`, service);
          
          const provider = service?.provider || service?.providerAddress || service?.address || key;
          const name = service?.name || service?.model || service?.serviceName || key;
          
          if (provider && name) {
            AVAILABLE_PROVIDERS[name] = provider;
            console.log(`✅ Found provider: ${name} -> ${provider}`);
          }
        });
      }
      
      this.lastProviderDiscovery = now;
      console.log('Discovered providers:', AVAILABLE_PROVIDERS);
      
      // If no providers found, use fallback
      if (Object.keys(AVAILABLE_PROVIDERS).length === 0) {
        console.log('No providers discovered, using fallback providers...');
        AVAILABLE_PROVIDERS = {
          "llama-3.3-70b-instruct": "0xf07240Efa67755B5311bc75784a061eDB47165Dd",
          "deepseek-r1-70b": "0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3"
        };
        console.log('Fallback providers set:', AVAILABLE_PROVIDERS);
      }
      
      return AVAILABLE_PROVIDERS;
      
    } catch (error) {
      console.error('Failed to discover providers:', error);
      
      // Fallback to hardcoded providers if discovery fails
      console.log('Using fallback providers...');
      AVAILABLE_PROVIDERS = {
        "llama-3.3-70b-instruct": "0xf07240Efa67755B5311bc75784a061eDB47165Dd",
        "deepseek-r1-70b": "0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3"
      };
      this.lastProviderDiscovery = now;
      return AVAILABLE_PROVIDERS;
    }
  }

  /**
   * Get a random available provider
   */
  static async getRandomProvider(): Promise<string> {
    if (Object.keys(AVAILABLE_PROVIDERS).length === 0) {
      await this.discoverProviders();
    }
    
    const providerNames = Object.keys(AVAILABLE_PROVIDERS);
    if (providerNames.length === 0) {
      throw new Error('No providers available');
    }
    
    const randomIndex = Math.floor(Math.random() * providerNames.length);
    const selectedProvider = providerNames[randomIndex];
    const providerAddress = AVAILABLE_PROVIDERS[selectedProvider];
    
    return providerAddress;
  }

  /**
   * Get the best available provider (preferring known stable ones)
   */
  static async getBestProvider(): Promise<string> {
    if (Object.keys(AVAILABLE_PROVIDERS).length === 0) {
      await this.discoverProviders();
    }
    
    const providerNames = Object.keys(AVAILABLE_PROVIDERS);
    if (providerNames.length === 0) {
      throw new Error('No providers available');
    }
    
    // Prefer known stable providers if available
    const preferredProviders = ['deepseek-r1-70b', 'llama-3.3-70b-instruct'];
    
    for (const preferred of preferredProviders) {
      if (AVAILABLE_PROVIDERS[preferred]) {
        return AVAILABLE_PROVIDERS[preferred];
      }
    }
    
    // Fallback to random selection
    return this.getRandomProvider();
  }

  /**
   * Acknowledge a provider before using their service
   * Uses the correct API: broker.inference.acknowledgeProviderSigner()
   */
  static async acknowledgeProvider(providerAddress: string): Promise<void> {
    await this.initializeBroker();
    
    try {
      await this.broker.inference.acknowledgeProviderSigner(providerAddress);
      console.log(`Provider ${providerAddress} acknowledged`);
    } catch (error) {
      console.error('Failed to acknowledge provider:', error);
      throw error;
    }
  }


  /**
   * Send a request to 0G Compute Network for AI analysis
   */
  static async sendAIRequest(prompt: string, providerAddress?: string): Promise<string> {
    await this.initializeBroker();

    try {
      // Use provided provider or discover and select a random one
      let provider: string;
      
      if (providerAddress) {
        provider = providerAddress;
      } else {
        provider = await this.getBestProvider();
      }
      
      if (!provider) {
        throw new Error('No provider available for AI request');
      }
      
      // Acknowledge provider first
      console.log('Acknowledging provider:', provider);
      await this.acknowledgeProvider(provider);
      
      // Add a small delay to ensure provider acknowledgment is processed
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try to refresh the acknowledgment to ensure it's properly registered
      try {
        await this.acknowledgeProvider(provider);
        console.log('Provider acknowledgment refreshed');
      } catch (refreshError) {
        console.log('Provider acknowledgment refresh failed (this might be normal):', refreshError);
      }

      // Get service metadata first
      console.log('Getting service metadata for provider:', provider);
      const { endpoint, model } = await this.broker.inference.getServiceMetadata(provider);
      console.log('Service metadata:', { endpoint, model });
      
      if (!endpoint || !model) {
        throw new Error('Invalid service metadata received');
      }
      
      // Generate request headers (only once to avoid nonce conflicts)
      console.log('Generating request headers for provider:', provider);
      console.log('Prompt length:', prompt.length);
      
      const headers = await this.broker.inference.getRequestHeaders(provider, prompt);
      console.log('Request headers:', headers);
      
      // Check if headers contain required signature fields
      if (!headers || !headers['X-Phala-Signature-Type'] || !headers['Address']) {
        console.error('Missing required signature headers:', headers);
        throw new Error('Invalid request headers generated');
      }
      
      // Log signature details for debugging
      console.log('Signature type:', headers['X-Phala-Signature-Type']);
      console.log('Address:', headers['Address']);
      console.log('Fee:', headers['Fee']);
      console.log('Nonce:', headers['Nonce']);

      const requestBody = {
        messages: [{ role: "user", content: prompt }],
        model: model,
      };
      console.log('Request body:', requestBody);

      // Send request using fetch
      console.log('Sending request to:', `${endpoint}/chat/completions`);
      const response = await fetch(`${endpoint}/chat/completions`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          ...headers 
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        // Try to get error details from response body
        let errorDetails = '';
        try {
          const errorData = await response.json();
          errorDetails = ` - ${JSON.stringify(errorData)}`;
        } catch (e) {
          errorDetails = ` - ${response.statusText}`;
        }
        console.error(`AI request failed: ${response.status} ${response.statusText}${errorDetails}`);
        console.error('Request details:', { endpoint, model, headers, requestBody });
        throw new Error(`AI request failed: ${response.status} ${response.statusText}${errorDetails}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from AI service');
      }
      
      const answer = data.choices[0].message.content;
      console.log('AI response:', answer);

      // Process response for verification
      const valid = await this.broker.inference.processResponse(provider, answer);
      console.log('Response verification:', valid);

      return answer;
    } catch (error) {
      console.error('AI request failed:', error);
      throw error;
    }
  }

  /**
   * Analyze traffic conditions using 0G Compute Network AI
   */
  static async analyzeTrafficConditions(request: TrafficAnalysisRequest): Promise<AITrafficInsight> {
    try {
      console.log('Starting 0G Compute traffic analysis...');
      
      // Ensure account is funded
      const balance = await this.getBalance();
      const balanceNum = parseFloat(balance);
      
      if (balanceNum < 0.01) {
        console.log('Account balance low, funding with 0.05 OG...');
        try {
          await this.fundAccount("0.05");
          console.log('Account funding successful');
        } catch (fundingError) {
          console.warn('Failed to fund account, continuing with current balance:', fundingError);
          // Continue with analysis even if funding fails
        }
      }

      const prompt = this.buildTrafficAnalysisPrompt(request);
      let analysis: AITrafficInsight;
      
      try {
        const response = await this.sendAIRequest(prompt);
        
        // Parse the AI response and return formatted analysis
        if (response) {
          try {
            const parsed = this.extractJson(response);
            const aiAnalysis = JSON.parse(parsed);
            analysis = this.validateAndFormatResponse(aiAnalysis);
          } catch (parseError) {
            console.warn('Failed to parse AI response, using fallback:', parseError);
            analysis = this.performIntelligentAnalysis(request);
          }
        } else {
          // Fallback to intelligent analysis if AI response is invalid
          analysis = this.performIntelligentAnalysis(request);
        }
        
      } catch (aiError) {
        console.warn('AI request failed, trying with different provider:', aiError);
        
        // Try with a different provider if available
        try {
          const providers = Object.keys(AVAILABLE_PROVIDERS);
          if (providers.length > 1) {
            console.log('Retrying with different provider...');
            const response = await this.sendAIRequest(prompt, undefined); // Will select a different provider
            analysis = this.validateAndFormatResponse(JSON.parse(this.extractJson(response)));
          } else {
            throw aiError;
          }
        } catch (retryError) {
          console.warn('Retry with different provider also failed:', retryError);
          console.warn('All AI requests failed, using intelligent analysis fallback');
          analysis = this.performIntelligentAnalysis(request);
        }
      }
      
      // Store the traffic analysis data for future reference
      await this.storeTrafficAnalysis(request, analysis);
      
      return analysis;
      
    } catch (error) {
      console.error('0G Compute analysis failed:', error);
      
      // Return fallback analysis
      const fallbackAnalysis = this.getFallbackAnalysis();
      
      // Still store the fallback analysis
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
    try {
      const trafficLevel = this.analyzeTrafficLevel(trafficData);
      const severity = this.determineSeverity(trafficLevel, 0.5);
      
      const recommendations = this.generateRecommendations(severity);
      return recommendations.join('. ') + '. Consider checking real-time traffic updates.';
      
    } catch (error) {
      console.error('Route optimization failed:', error);
      return 'Route optimization temporarily unavailable. Please try again later.';
    }
  }

  /**
   * Predict traffic trends using AI
   */
  static async predictTrafficTrends(_historicalData: any[], currentConditions: any): Promise<any> {
    try {
      const currentTrafficLevel = this.analyzeTrafficLevel(currentConditions);
      
      return {
        nextHour: { congestion: Math.round(currentTrafficLevel * 100), confidence: 0.7 },
        next2Hours: { congestion: Math.round(currentTrafficLevel * 90), confidence: 0.6 },
        next4Hours: { congestion: Math.round(currentTrafficLevel * 80), confidence: 0.5 },
        peakTime: "17:30",
        reasoning: "Based on current traffic patterns and time of day"
      };
      
    } catch (error) {
      console.error('Traffic prediction failed:', error);
      return this.getFallbackPrediction();
    }
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
    const { currentTraffic, userLocation, destination, timeOfDay, weatherConditions } = request;
    
    return `
      Analyze current traffic conditions and provide intelligent insights:
      
      Current Traffic Data: ${JSON.stringify(currentTraffic, null, 2)}
      User Location: ${userLocation.lat}, ${userLocation.lng}
      ${destination ? `Destination: ${destination}` : ''}
      Time of Day: ${timeOfDay}
      ${weatherConditions ? `Weather: ${weatherConditions}` : ''}
      
      Please provide a comprehensive traffic analysis in the following JSON format:
      {
        "severity": "low|moderate|high|severe",
        "confidence": 0.0-1.0,
        "summary": "Brief overview of current traffic situation",
        "recommendations": ["specific actionable advice"],
        "predictedCongestion": 0-100,
        "bestTimeToTravel": "HH:MM format or description",
        "alternativeRoutesSuggestion": "AI recommendation for route alternatives",
        "estimatedDelay": 0-60
      }
      
      Focus on practical, actionable insights that help users make better travel decisions.
    `;
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

  private static getFallbackPrediction(): any {
    return {
      nextHour: { congestion: 50, confidence: 0.6 },
      next2Hours: { congestion: 45, confidence: 0.5 },
      next4Hours: { congestion: 40, confidence: 0.4 },
      peakTime: "17:30",
      reasoning: "Prediction service temporarily unavailable"
    };
  }
}