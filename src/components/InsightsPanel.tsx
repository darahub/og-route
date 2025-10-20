import React, { useState } from 'react';
import { Sparkles, BarChart3, Database, SlidersHorizontal } from 'lucide-react';
import { TrafficAnalytics } from './TrafficAnalytics';
import { StorageViewer } from './StorageViewer';
import { FilterPanel } from './FilterPanel';

/**
 * InsightsPanel
 * Condenses multiple right-side cards into a single panel with a compact switcher.
 * No data is removed; you can toggle between the full views.
 */
export const InsightsPanel: React.FC = () => {
  const [activeView, setActiveView] = useState<'analytics' | 'storage' | 'filters'>('analytics');

  const views = [
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'storage', label: 'Storage', icon: Database },
    { key: 'filters', label: 'Filters', icon: SlidersHorizontal },
  ] as const;

  return (
    <div className="card p-4 sm:p-6 rounded-2xl">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-accent" />
          <h2 className="section-title">Insights & Controls</h2>
        </div>
      </div>

      {/* Compact switcher */}
      <div className="flex items-center bg-muted/60 rounded-full p-1 mb-4 sm:mb-6 border border-border">
        {views.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveView(key)}
            className={`flex items-center space-x-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 ${
              activeView === key
                ? 'bg-surface shadow-sm text-foreground'
                : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Content area - only one is visible at a time */}
      <div className="animate-fadeIn">
        {activeView === 'analytics' && (
          <TrafficAnalytics />
        )}
        {activeView === 'storage' && (
          <StorageViewer embedded />
        )}
        {activeView === 'filters' && (
          <FilterPanel />
        )}
      </div>
    </div>
  );
};