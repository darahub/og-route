/**
 * 0G Storage Service - Simple Implementation
 * Saves traffic data to decentralized 0G storage via API
 */

import { StorageMetadataService } from './storageMetadata';

// Use VITE_API_URL if set, otherwise default to relative paths (for production)
const API_URL = import.meta.env.VITE_API_URL || '';

export class ZeroGStorageService {
  /**
   * Upload traffic data to 0G Storage
   */
  static async uploadTrafficData(data: any): Promise<{ rootHash: string; txHash: string; timestamp: string }> {
    const response = await fetch(`${API_URL}/api/storage/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Storage upload failed');
    }

    const result = await response.json();
    console.log('✅ Uploaded to 0G Storage:', result);
    return result;
  }

  /**
   * Save current traffic conditions
   */
  static async saveTrafficConditions(trafficData: any[]): Promise<{ rootHash: string; txHash: string; timestamp: string }> {
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
