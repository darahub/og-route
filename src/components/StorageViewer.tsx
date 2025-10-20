/**
 * Storage Viewer Component
 * View all data stored on 0G Storage
 */

import React, { useState, useEffect } from 'react';
import { Database, Download, FileText, Package, RefreshCw, Save, MapPin } from 'lucide-react';
import { TrafficDataStorageService } from '../services/trafficDataStorage';

// Use VITE_API_URL if set, otherwise default to relative paths (for production)
const API_URL = import.meta.env.VITE_API_URL || '';

export const StorageViewer: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const [storageData, setStorageData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  useEffect(() => {
    loadStorageData();
    // Refresh every 30 seconds
    const interval = setInterval(loadStorageData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStorageData = async () => {
    setIsLoading(true);
    try {
      const url = `${API_URL}/api/storage/metadata`;
      const response = await fetch(url);
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text || `metadata request failed (status=${response.status})`);
      }
      const data = await response.json();
      setStorageData(data);
    } catch (error) {
      console.error('Failed to load storage metadata:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (rootHash: string) => {
    try {
      const response = await fetch(`${API_URL}/api/storage/download/${rootHash}`);
      if (!response.ok) throw new Error('Download failed');

      const data = await response.json();
      console.log('Downloaded data:', data);

      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `0g-data-${rootHash.slice(0, 10)}.json`;
      a.click();
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download data');
    }
  };

  const handleExportAll = async () => {
    try {
      const response = await fetch(`${API_URL}/api/storage/export`);
      const data = await response.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `0g-storage-all-users-${Date.now()}.json`;
      a.click();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data');
    }
  };

  const handleManualBackup = async () => {
    setIsBackingUp(true);
    setBackupStatus(null);
    try {
      const storageService = TrafficDataStorageService.getInstance();
      const result = await storageService.createZeroGBackup();

      if (result.success) {
        setBackupStatus(`✅ Backup successful! Root Hash: ${result.rootHash?.slice(0, 16)}...`);
        // Reload storage data to show new backup
        setTimeout(() => loadStorageData(), 2000);
      } else {
        setBackupStatus(`❌ Backup failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Backup failed:', error);
      setBackupStatus(`❌ Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsBackingUp(false);
      // Clear status after 10 seconds
      setTimeout(() => setBackupStatus(null), 10000);
    }
  };

  if (!storageData) return null;

  const containerClass = embedded ? '' : 'card rounded-2xl p-6';

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center space-x-3">
          <Database className="h-6 w-6 text-primary" />
          <h2 className="section-title">0G storage</h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={loadStorageData}
            disabled={isLoading}
            className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 text-primary ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleManualBackup}
            disabled={isBackingUp}
            className="flex items-center space-x-2 px-3 py-1.5 bg-success text-white rounded-lg hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Create manual backup to 0G Storage"
          >
            <Save className={`h-4 w-4 ${isBackingUp ? 'animate-pulse' : ''}`} />
            <span>{isBackingUp ? 'Backing up...' : 'Backup Now'}</span>
          </button>
          <button
            onClick={handleExportAll}
            className="flex items-center space-x-2 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            <Package className="h-4 w-4" />
            <span>Export All</span>
          </button>
        </div>
      </div>

      {/* Backup Status Message */}
      {backupStatus && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          backupStatus.startsWith('✅')
            ? 'bg-success/10 text-success border border-success/30'
            : 'bg-danger/10 text-danger border border-danger/30'
        }`}>
          {backupStatus}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-muted/30 rounded-lg p-4">
          <p className="text-sm text-foreground/60 mb-1">Total Files</p>
          <p className="text-2xl font-bold">{storageData.totalFiles}</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-4">
          <p className="text-sm text-foreground/60 mb-1">Traffic Data</p>
          <p className="text-2xl font-bold">{storageData.byType.traffic_conditions || 0}</p>
        </div>
        <div className="bg-muted/30 rounded-lg p-4">
          <p className="text-sm text-foreground/60 mb-1">Route Data</p>
          <p className="text-2xl font-bold">{storageData.byType.route_data || 0}</p>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {[...storageData.metadata]
          .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .map((item: any) => (
          <div key={item.id} className="bg-muted/20 rounded-lg p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{item.description}</span>
                  {item?.metadata?.destination && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-primary/10 text-primary text-xs">
                      <MapPin className="h-3 w-3 mr-1" />
                      {item.metadata.destination}
                    </span>
                  )}
                </div>
                <div className="text-xs text-foreground/60 space-y-1">
                  <p>Root Hash: <code className="bg-muted px-2 py-0.5 rounded">{item.rootHash?.slice(0, 20) || 'N/A'}...</code></p>
                  <p>Tx Hash: <code className="bg-muted px-2 py-0.5 rounded">{typeof item.txHash === 'string' ? item.txHash.slice(0, 20) : (item.txHash?.txHash?.slice(0, 20) || 'N/A')}...</code></p>
                  <p>Time: {new Date(item.timestamp).toLocaleString()}</p>
                  <p>Destination: {item?.metadata?.destination || '—'}</p>
                </div>
              </div>
              <button
                onClick={() => handleDownload(item.rootHash)}
                className="ml-4 p-2 hover:bg-primary/10 rounded-lg transition-colors"
                title="Download data"
              >
                <Download className="h-4 w-4 text-primary" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {storageData.totalFiles === 0 && (
        <div className="text-center py-8 text-foreground/60">
          <Database className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm">No data stored yet</p>
        </div>
      )}
    </div>
  );
};
