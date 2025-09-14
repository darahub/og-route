import React from 'react';
import { Clock, MapPin, AlertTriangle, TrendingUp, Route, Zap, Activity } from 'lucide-react';
import { TrafficData } from '../types';

interface TrafficListProps {
  trafficData: TrafficData[];
}

export const TrafficList: React.FC<TrafficListProps> = ({ trafficData }) => {
  const getSeverityColor = (severity: TrafficData['severity']) => {
    switch (severity) {
      case 'severe': return 'text-danger bg-danger/10 border-danger/30';
      case 'high': return 'text-warning bg-warning/10 border-warning/30';
      case 'moderate': return 'text-accent bg-accent/10 border-accent/30';
      case 'low': return 'text-success bg-success/10 border-success/30';
      default: return 'text-foreground/70 bg-muted/40 border-border';
    }
  };

  const getSeverityIcon = (severity: TrafficData['severity']) => {
    if (severity === 'severe' || severity === 'high') {
      return <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 animate-pulse" />;
    }
    return <Activity className="h-3 w-3 sm:h-4 sm:w-4" />;
  };

  const sortedData = [...trafficData].sort((a, b) => {
    const severityOrder = { severe: 4, high: 3, moderate: 2, low: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });

  // Show only top 5 most severe traffic conditions
  const topTrafficData = sortedData.slice(0, 5);

  return (
    <div className="card p-4 sm:p-6 rounded-2xl transition-all duration-300 hover:shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Route className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse"></div>
          </div>
          <div>
            <h2 className="section-title">
              Live Traffic Alerts
            </h2>
            <p className="text-xs text-foreground/60">Real-time conditions</p>
          </div>
        </div>
        <div className="badge">
          <Zap className="h-3 w-3 text-primary" />
          <span className="text-xs sm:text-sm font-medium">
            Top {Math.min(trafficData.length, 5)} alerts
          </span>
        </div>
      </div>

      <div className="space-y-3 max-h-80 sm:max-h-96 overflow-y-auto custom-scrollbar">
        {topTrafficData.map((traffic, index) => (
          <div
            key={traffic.id}
            className="border rounded-xl p-3 sm:p-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] bg-surface/60 backdrop-blur-sm border-border"
            style={{
              animationDelay: `${index * 100}ms`,
              animation: 'slideInUp 0.5s ease-out forwards'
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${getSeverityColor(traffic.severity)}`}>
                    {getSeverityIcon(traffic.severity)}
                    <span className="capitalize">{traffic.severity}</span>
                  </span>
                  <div className="flex items-center space-x-1 bg-muted/50 rounded-full px-2 py-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-foreground/80">
                      {traffic.confidence}% confident
                    </span>
                  </div>
                </div>

                <div className="flex items-start space-x-2 mb-3">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-foreground/50 flex-shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm font-medium text-foreground line-clamp-2">
                    {traffic.location.address}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-foreground/80">
                  <div className="flex items-center space-x-2 bg-primary/10 rounded-lg p-2">
                    <Clock className="h-3 w-3 flex-shrink-0 text-primary" />
                    <div>
                      <div className="font-medium text-primary/90">{traffic.duration}min</div>
                      <div className="text-xs opacity-75">Duration</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 bg-success/10 rounded-lg p-2">
                    <TrendingUp className="h-3 w-3 flex-shrink-0 text-success" />
                    <div>
                      <div className="font-medium text-success/90">{traffic.speed} mph</div>
                      <div className="text-xs opacity-75">Speed</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress bar for severity */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-foreground/60 mb-1">
                <span>Traffic Intensity</span>
                <span>{traffic.confidence}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div 
                  className={`h-1.5 rounded-full transition-all duration-1000 ${
                    traffic.severity === 'severe' ? 'bg-danger' :
                    traffic.severity === 'high' ? 'bg-warning' :
                    traffic.severity === 'moderate' ? 'bg-accent' :
                    'bg-success'
                  }`}
                  style={{ 
                    width: `${traffic.confidence}%`,
                    animationDelay: `${index * 200}ms`
                  }}
                ></div>
              </div>
            </div>
          </div>
        ))}

        {trafficData.length === 0 && (
          <div className="text-center py-8 text-foreground/60">
            <div className="relative mb-4">
              <Route className="h-12 w-12 mx-auto opacity-30" />
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-green-500/20 rounded-full animate-ping"></div>
            </div>
            <p className="text-sm font-medium">Analyzing your area...</p>
            <p className="text-xs mt-1">Traffic conditions will appear here when available</p>
          </div>
        )}
      </div>

      {trafficData.length > 5 && (
        <div className="mt-4 text-center">
          <button className="text-xs sm:text-sm text-primary hover:opacity-90 font-medium transition-all duration-200 hover:scale-105 bg-primary/10 px-4 py-2 rounded-full border border-primary/30">
            View All {trafficData.length} Conditions →
          </button>
        </div>
      )}
    </div>
  );
};