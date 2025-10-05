/**
 * Centralized Storage Database
 * Stores all 0G Storage metadata from all users
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const DB_FILE = join(process.cwd(), 'storage-metadata.json');

class StorageDatabase {
  constructor() {
    this.ensureDatabase();
  }

  ensureDatabase() {
    if (!existsSync(DB_FILE)) {
      writeFileSync(DB_FILE, JSON.stringify({ metadata: [] }, null, 2));
    }
  }

  read() {
    const data = readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  }

  write(data) {
    writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  }

  addMetadata(metadata) {
    const db = this.read();
    const entry = {
      id: `${metadata.dataType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      rootHash: metadata.rootHash,
      txHash: metadata.txHash,
      timestamp: metadata.timestamp,
      dataType: metadata.dataType,
      description: metadata.description,
      metadata: metadata.metadata || {},
      createdAt: new Date().toISOString()
    };

    db.metadata.push(entry);
    this.write(db);
    console.log('💾 Saved to database:', entry.id);
    return entry;
  }

  getAllMetadata() {
    const db = this.read();
    return db.metadata;
  }

  getStats() {
    const all = this.getAllMetadata();
    const byType = all.reduce((acc, item) => {
      acc[item.dataType] = (acc[item.dataType] || 0) + 1;
      return acc;
    }, {});

    return {
      totalFiles: all.length,
      byType,
      metadata: all.slice(-50).reverse() // Last 50 items
    };
  }

  getByRootHash(rootHash) {
    const all = this.getAllMetadata();
    return all.find(m => m.rootHash === rootHash);
  }

  exportAll() {
    return this.read();
  }
}

export const storageDB = new StorageDatabase();
