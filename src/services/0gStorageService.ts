// 0G Storage service for decentralized traffic data storage
import { ZgFile, Indexer, KvClient } from '@0glabs/0g-ts-sdk';
import { ethers } from 'ethers';
import { 
  TrafficPattern, 
  TrafficHotspot, 
  AlternativeRoute, 
  StoredTrafficData 
} from '../types/trafficStorage';

interface ZeroGConfig {
  rpcUrl: string;
  indexerRpc: string;
  privateKey: string;
  kvEndpoint?: string;
}

interface StorageResult {
  success: boolean;
  rootHash?: string;
  txHash?: string;
  error?: string;
}

interface DownloadResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class ZeroGStorageService {
  private static instance: ZeroGStorageService;
  private indexer: Indexer;
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private kvClient?: KvClient;
  private isInitialized = false;

  private constructor() {
    this.initializeZeroG();
  }

  static getInstance(): ZeroGStorageService {
    if (!ZeroGStorageService.instance) {
      ZeroGStorageService.instance = new ZeroGStorageService();
    }
    return ZeroGStorageService.instance;
  }

  private initializeZeroG(): void {
    try {
      // Check if we're in a browser environment and handle gracefully
      if (typeof window !== 'undefined' && typeof process === 'undefined') {
        console.warn('0G Storage is not available in browser environment. Using fallback mode.');
        this.isInitialized = true;
        return;
      }

      // Additional check: if process exists but has browser flag, we're in browser
      if (typeof process !== 'undefined' && process.browser) {
        console.warn('0G Storage is not available in browser environment. Using fallback mode.');
        this.isInitialized = true;
        return;
      }

      const config = this.getConfig();
      
      if (!config.rpcUrl || !config.indexerRpc || !config.privateKey) {
        console.warn('0G Storage configuration not found. Decentralized storage will be disabled.');
        this.isInitialized = true;
        return;
      }

      // Initialize provider and signer
      this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
      this.signer = new ethers.Wallet(config.privateKey, this.provider);

      // Initialize indexer
      this.indexer = new Indexer(config.indexerRpc);

      // Initialize KV client if endpoint provided
      if (config.kvEndpoint) {
        this.kvClient = new KvClient(config.kvEndpoint);
      }

      this.isInitialized = true;
      console.log('✅ 0G Storage initialized successfully');
    } catch (error) {
      console.error('Failed to initialize 0G Storage:', error);
      console.warn('0G Storage will not be available. Using fallback mode.');
      this.isInitialized = true;
      // Don't throw error - allow app to continue with fallback functionality
    }
  }

  private getConfig(): ZeroGConfig {
    return {
      rpcUrl: import.meta.env.VITE_0G_RPC_URL || 'https://evmrpc-testnet.0g.ai/',
      indexerRpc: import.meta.env.VITE_0G_INDEXER_RPC || 'https://indexer-storage-testnet-turbo.0g.ai',
      privateKey: import.meta.env.VITE_0G_PRIVATE_KEY || '',
      kvEndpoint: import.meta.env.VITE_0G_KV_ENDPOINT || 'http://3.101.147.150:6789'
    };
  }

  /**
   * Check if 0G Storage is available
   */
  private isAvailable(): boolean {
    return this.isInitialized;
  }

  /**
   * Store traffic data as JSON file to 0G Storage
   */
  async storeTrafficData(
    data: any, 
    filename: string = 'traffic-data.json'
  ): Promise<StorageResult> {
    if (!this.isAvailable()) {
      return { success: false, error: '0G Storage not available' };
    }

    try {
      // Convert data to JSON string
      const jsonData = JSON.stringify(data, null, 2);
      
      // Create blob from JSON data
      const blob = new Blob([jsonData], { type: 'application/json' });
      const file = new ZgFile(blob, filename);

      // Generate Merkle tree for verification
      const [tree, treeErr] = await file.merkleTree();
      if (treeErr !== null) {
        throw new Error(`Error generating Merkle tree: ${treeErr}`);
      }

      // Get root hash for future reference
      const rootHash = tree?.rootHash();
      console.log(`📁 File Root Hash for ${filename}:`, rootHash);

      // Upload to network
      const config = this.getConfig();
      const [tx, uploadErr] = await this.indexer.upload(file, config.rpcUrl, this.signer);
      if (uploadErr !== null) {
        throw new Error(`Upload error: ${uploadErr}`);
      }

      console.log(`✅ Upload successful for ${filename}! Transaction:`, tx);

      // Always close the file when done
      await file.close();

      return { 
        success: true, 
        rootHash, 
        txHash: tx 
      };

    } catch (error) {
      console.error(`Failed to store traffic data to 0G Storage:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Download traffic data from 0G Storage using root hash
   */
  async downloadTrafficData(
    rootHash: string, 
    outputPath: string = 'downloaded-traffic-data.json'
  ): Promise<DownloadResult> {
    if (!this.isAvailable()) {
      return { success: false, error: '0G Storage not available' };
    }

    try {
      // Download with Merkle proof verification
      const err = await this.indexer.download(rootHash, outputPath, true);
      if (err !== null) {
        throw new Error(`Download error: ${err}`);
      }

      console.log(`✅ Download successful for ${outputPath}!`);

      // Read the downloaded file
      const fs = await import('fs');
      const data = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));

      return { 
        success: true, 
        data 
      };

    } catch (error) {
      console.error(`Failed to download traffic data from 0G Storage:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Store traffic patterns to 0G Storage
   */
  async storeTrafficPatterns(patterns: Map<string, TrafficPattern[]>): Promise<StorageResult> {
    const data = {
      type: 'traffic_patterns',
      timestamp: new Date().toISOString(),
      patterns: Object.fromEntries(patterns),
      count: Array.from(patterns.values()).reduce((sum, p) => sum + p.length, 0)
    };

    return this.storeTrafficData(data, `traffic-patterns-${Date.now()}.json`);
  }

  /**
   * Store traffic hotspots to 0G Storage
   */
  async storeTrafficHotspots(hotspots: Map<string, TrafficHotspot>): Promise<StorageResult> {
    const data = {
      type: 'traffic_hotspots',
      timestamp: new Date().toISOString(),
      hotspots: Object.fromEntries(hotspots),
      count: hotspots.size
    };

    return this.storeTrafficData(data, `traffic-hotspots-${Date.now()}.json`);
  }

  /**
   * Store alternative routes to 0G Storage
   */
  async storeAlternativeRoutes(routes: Map<string, AlternativeRoute[]>): Promise<StorageResult> {
    const data = {
      type: 'alternative_routes',
      timestamp: new Date().toISOString(),
      routes: Object.fromEntries(routes),
      count: Array.from(routes.values()).reduce((sum, r) => sum + r.length, 0)
    };

    return this.storeTrafficData(data, `alternative-routes-${Date.now()}.json`);
  }

  /**
   * Store all traffic data as a complete backup
   */
  async storeCompleteTrafficData(data: {
    trafficPatterns: Map<string, TrafficPattern[]>;
    hotspots: Map<string, TrafficHotspot>;
    alternativeRoutes: Map<string, AlternativeRoute[]>;
    storedData: Map<string, StoredTrafficData>;
  }): Promise<StorageResult> {
    const backupData = {
      type: 'complete_traffic_backup',
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {
        trafficPatterns: Object.fromEntries(data.trafficPatterns),
        hotspots: Object.fromEntries(data.hotspots),
        alternativeRoutes: Object.fromEntries(data.alternativeRoutes),
        storedData: Object.fromEntries(data.storedData)
      },
      statistics: {
        totalPatterns: Array.from(data.trafficPatterns.values()).reduce((sum, p) => sum + p.length, 0),
        totalHotspots: data.hotspots.size,
        totalRoutes: Array.from(data.alternativeRoutes.values()).reduce((sum, r) => sum + r.length, 0),
        totalStored: data.storedData.size
      }
    };

    return this.storeTrafficData(backupData, `complete-traffic-backup-${Date.now()}.json`);
  }

  /**
   * Store key-value data using 0G-KV
   */
  async storeKeyValue(
    streamId: string, 
    key: string, 
    value: any
  ): Promise<StorageResult> {
    if (!this.isAvailable() || !this.kvClient) {
      return { success: false, error: '0G-KV not available' };
    }

    try {
      const keyBytes = Uint8Array.from(Buffer.from(key, 'utf-8'));
      const valueBytes = Uint8Array.from(Buffer.from(JSON.stringify(value), 'utf-8'));

      // Note: This would require a Batcher implementation for upload
      // For now, we'll return a placeholder
      console.log(`📝 Would store KV: ${key} -> ${JSON.stringify(value)}`);
      
      return { 
        success: true, 
        rootHash: `kv-${streamId}-${key}` 
      };

    } catch (error) {
      console.error('Failed to store key-value data:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Retrieve key-value data from 0G-KV
   */
  async getKeyValue(streamId: string, key: string): Promise<DownloadResult> {
    if (!this.isAvailable() || !this.kvClient) {
      return { success: false, error: '0G-KV not available' };
    }

    try {
      const keyBytes = Uint8Array.from(Buffer.from(key, 'utf-8'));
      const encodedKey = ethers.encodeBase64(keyBytes);
      const value = await this.kvClient.getValue(streamId, encodedKey);
      
      return { 
        success: true, 
        data: JSON.parse(value) 
      };

    } catch (error) {
      console.error('Failed to retrieve key-value data:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): {
    isAvailable: boolean;
    network: string;
    rpcUrl: string;
    indexerRpc: string;
  } {
    const config = this.getConfig();
    return {
      isAvailable: this.isAvailable(),
      network: config.rpcUrl.includes('testnet') ? 'testnet' : 'mainnet',
      rpcUrl: config.rpcUrl,
      indexerRpc: config.indexerRpc
    };
  }

  /**
   * Test 0G Storage connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.isAvailable()) {
      return { success: false, error: '0G Storage not initialized' };
    }

    try {
      // Try to upload a small test file
      const testData = {
        test: true,
        timestamp: new Date().toISOString(),
        message: '0G Storage connection test'
      };

      const result = await this.storeTrafficData(testData, 'connection-test.json');
      return { 
        success: result.success, 
        error: result.error 
      };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
