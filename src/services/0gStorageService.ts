/**
 * 0G Storage Service - Simple Implementation
 * Saves traffic data to decentralized 0G storage via API
 */

import { StorageMetadataService } from './storageMetadata';

// Use VITE_API_URL if set; in dev default to localhost:4000; in prod use relative
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:4000' : '');

export class ZeroGStorageService {
  /**
   * Upload traffic data to 0G Storage
   */
  static async uploadTrafficData(data: any): Promise<{ rootHash: string; txHash: string; timestamp: string }> {
    console.log('🔵 [0G Storage] Preparing data for 0G decentralized storage...');
    console.log('📦 [0G Storage] Data to be saved:', JSON.stringify({ data }));
    const endpoint = `${API_URL}/api/storage/save`;
    console.log('🔵 [0G Storage] Endpoint:', endpoint);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    });

    // Read body as text first to avoid JSON parse crashes on empty/non-JSON bodies
    const contentType = response.headers.get('content-type') || '';
    let bodyText: string = '';
    try {
      bodyText = await response.text();
    } catch (e) {
      bodyText = '';
    }

    let parsed: any = null;
    if (bodyText) {
      if (contentType.includes('application/json')) {
        try { parsed = JSON.parse(bodyText); } catch {}
      } else if (bodyText.trim().startsWith('{')) {
        try { parsed = JSON.parse(bodyText); } catch {}
      }
    }

    if (!response.ok) {
      const statusInfo = `status=${response.status}`;
      const errMsg = (parsed && parsed.error) ? parsed.error : (bodyText || `Storage upload failed (${statusInfo})`);
      throw new Error(errMsg);
    }

    if (!parsed) {
      throw new Error('Empty or non-JSON response from storage endpoint');
    }

    console.log('🔵 [0G Storage] Uploading to 0G Storage Network...');
    console.log('✅ [0G Storage] Data successfully uploaded to 0G Storage Network');
    console.log('📦 [0G Storage] Root Hash:', parsed.rootHash);
    console.log('📝 [0G Storage] Transaction Hash:', parsed.txHash);
    return parsed;
  }

  /**
   * Save current traffic conditions
   */
  static async saveTrafficConditions(trafficData: any[]): Promise<{ rootHash: string; txHash: string; timestamp: string }> {
    console.log(`🔵 [0G Storage] Saving ${trafficData.length} traffic data points to 0G Storage...`);
    const data = {
      type: 'traffic_conditions',
      timestamp: new Date().toISOString(),
      count: trafficData.length,
      data: trafficData
    };

    const result = await this.uploadTrafficData(data);

    // Save metadata for retrieval
    StorageMetadataService.saveMetadata({
      rootHash: result.rootHash,
      txHash: result.txHash,
      timestamp: result.timestamp,
      dataType: 'traffic_conditions',
      description: `Traffic conditions data (${trafficData.length} items)`,
      metadata: { count: trafficData.length }
    });

    console.log('✅ [0G Storage] Traffic conditions metadata saved locally for retrieval');
    return result;
  }

  /**
   * Save route data
   */
  static async saveRouteData(routeData: any): Promise<{ rootHash: string; txHash: string; timestamp: string }> {
    const data = {
      type: 'route_data',
      timestamp: new Date().toISOString(),
      ...routeData
    };

    const result = await this.uploadTrafficData(data);

    // Save metadata for retrieval
    StorageMetadataService.saveMetadata({
      rootHash: result.rootHash,
      txHash: result.txHash,
      timestamp: result.timestamp,
      dataType: 'route_data',
      description: `Route from ${routeData.origin?.lat},${routeData.origin?.lng} to ${routeData.destination}`,
      metadata: {
        destination: routeData.destination,
        routeCount: routeData.routes?.length || 0
      }
    });

    return result;
  }

  /**
   * Download data from 0G Storage
   */
  static async downloadData(rootHash: string): Promise<any> {
    // This would be called from server-side
    // For now, we just retrieve the metadata
    const metadata = StorageMetadataService.getByRootHash(rootHash);
    if (!metadata) {
      throw new Error('Metadata not found for this root hash');
    }
    return metadata;
  }

  /**
   * Get all stored data metadata (for AI training)
   */
  static getAllStoredData() {
    return StorageMetadataService.exportForTraining();
  }
}
