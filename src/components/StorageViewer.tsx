/**
 * Storage Viewer Component
 * View all data stored on 0G Storage
 */

import React, { useState, useEffect } from 'react';
import { Database, Download, FileText, Package, RefreshCw } from 'lucide-react';

const API_URL = 'http://localhost:4000';

export const StorageViewer: React.FC = () => {
  const [storageData, setStorageData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadStorageData();
    // Refresh every 30 seconds
    const interval = setInterval(loadStorageData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStorageData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/storage/metadata`);
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
      const response = await fetch(`http://localhost:4000/api/storage/download/${rootHash}`);
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

  if (!storageData) return null;

  return (
    <div className="card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Database className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">0G Storage (All Users)</h2>
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
            onClick={handleExportAll}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            <Package className="h-4 w-4" />
            <span>Export All</span>
          </button>
        </div>
      </div>

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
        {storageData.metadata.slice().reverse().map((item: any) => (
          <div key={item.id} className="bg-muted/20 rounded-lg p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{item.description}</span>
                </div>
                <div className="text-xs text-foreground/60 space-y-1">
                  <p>Root Hash: <code className="bg-muted px-2 py-0.5 rounded">{item.rootHash?.slice(0, 20) || 'N/A'}...</code></p>
                  <p>Tx Hash: <code className="bg-muted px-2 py-0.5 rounded">{typeof item.txHash === 'string' ? item.txHash.slice(0, 20) : (item.txHash?.txHash?.slice(0, 20) || 'N/A')}...</code></p>
                  <p>Time: {new Date(item.timestamp).toLocaleString()}</p>
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
