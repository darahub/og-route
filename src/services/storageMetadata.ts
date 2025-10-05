/**
 * Storage Metadata Service
 * Tracks all data uploaded to 0G Storage for future retrieval and AI training
 */

export interface StorageMetadata {
  id: string;
  rootHash: string;
  txHash: string;
  timestamp: string;
  dataType: 'traffic_conditions' | 'route_data' | 'ai_insights';
  description: string;
  size?: number;
  metadata?: any;
}

const STORAGE_KEY = '0g_storage_metadata';

export class StorageMetadataService {
  /**
   * Save metadata about uploaded file
   */
  static saveMetadata(metadata: Omit<StorageMetadata, 'id'>): StorageMetadata {
    const id = `${metadata.dataType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullMetadata: StorageMetadata = { id, ...metadata };

    const existing = this.getAllMetadata();
    existing.push(fullMetadata);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    console.log('📝 Metadata saved:', fullMetadata);

    return fullMetadata;
  }

  /**
   * Get all stored metadata
   */
  static getAllMetadata(): StorageMetadata[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Get metadata by root hash
   */
  static getByRootHash(rootHash: string): StorageMetadata | null {
    const all = this.getAllMetadata();
    return all.find(m => m.rootHash === rootHash) || null;
  }

  /**
   * Get metadata by data type
   */
  static getByType(dataType: string): StorageMetadata[] {
    const all = this.getAllMetadata();
    return all.filter(m => m.dataType === dataType);
  }

  /**
   * Get recent uploads
   */
  static getRecent(limit: number = 10): StorageMetadata[] {
    const all = this.getAllMetadata();
    return all.slice(-limit).reverse();
  }

  /**
   * Export all metadata (for AI training)
   */
  static exportForTraining(): {
    metadata: StorageMetadata[];
    totalFiles: number;
    byType: Record<string, number>;
  } {
    const all = this.getAllMetadata();

    const byType = all.reduce((acc, item) => {
      acc[item.dataType] = (acc[item.dataType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      metadata: all,
      totalFiles: all.length,
      byType
    };
  }

  /**
   * Clear all metadata
   */
  static clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ All metadata cleared');
  }
}
