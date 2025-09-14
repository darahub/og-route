import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  MapPin, 
  Clock, 
  TrendingUp, 
  Calendar, 
  Route, 
  AlertTriangle,
  Target,
  Activity,
  Zap
} from 'lucide-react';
import { ZeroGComputeService } from '../services/0gComputeService';
import { useGeolocation } from '../hooks/useGeolocation';

interface TrafficAnalyticsProps {
  className?: string;
}

export const TrafficAnalytics: React.FC<TrafficAnalyticsProps> = ({ className = '' }) => {
  const { location: userLocation } = useGeolocation();
  const [analytics, setAnalytics] = useState<any>(null);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'all'>('week');

  useEffect(() => {
    if (userLocation) {
      loadAnalytics();
    }
  }, [userLocation, selectedTimeframe]);

  const loadAnalytics = async () => {
    if (!userLocation) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load traffic analytics
      const analyticsData = await ZeroGComputeService.getTrafficAnalytics(userLocation);
      setAnalytics(analyticsData);

      // Load nearby hotspots
      const hotspotsData = await ZeroGComputeService.getNearbyHotspots(userLocation, 10);
      setHotspots(hotspotsData);

    } catch (error) {
      console.error('Failed to load traffic analytics:', error);
      setError('Failed to load traffic analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-500 bg-green-50 border-green-200';
      case 'moderate': return 'text-yellow-500 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-orange-500 bg-orange-50 border-orange-200';
      case 'severe': return 'text-red-500 bg-red-50 border-red-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'low': return <TrendingUp className="h-4 w-4" />;
      case 'moderate': return <Clock className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'severe': return <AlertTriangle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  if (!userLocation) {
    return (
      <div className={`card rounded-2xl p-4 sm:p-6 ${className}`}>
        <div className="text-center py-8 text-foreground/60">
          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm font-medium">Location Required for Traffic Analytics</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`card rounded-2xl p-4 sm:p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <div className="absolute inset-0 rounded-full h-8 w-8 border-t-2 border-pink-600 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <span className="text-sm text-foreground/60">Loading traffic analytics...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`card rounded-2xl p-4 sm:p-6 ${className}`}>
        <div className="text-center py-8 text-foreground/60">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`card rounded-2xl p-4 sm:p-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-2 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <BarChart3 className="h-6 w-6 sm:h-7 sm:w-7 text-accent" />
          <div>
            <h2 className="section-title">Traffic Analytics</h2>
            <p className="text-xs text-foreground/60">Historical traffic patterns and hotspots</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          {(['week', 'month', 'all'] as const).map((timeframe) => (
            <button
              key={timeframe}
              onClick={() => setSelectedTimeframe(timeframe)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedTimeframe === timeframe
                  ? 'bg-accent text-white'
                  : 'bg-muted text-foreground/60 hover:bg-muted/80'
              }`}
            >
              {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {analytics && (
        <div className="space-y-4">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3 border border-border bg-primary/10">
              <div className="flex items-center space-x-2 mb-1">
                <Activity className="h-3 w-3 text-primary" />
                <span className="text-xs font-medium text-primary/90">Data Points</span>
              </div>
              <p className="text-lg font-bold text-primary">{analytics.totalDataPoints}</p>
            </div>

            <div className="rounded-lg p-3 border border-border bg-warning/10">
              <div className="flex items-center space-x-2 mb-1">
                <TrendingUp className="h-3 w-3 text-warning" />
                <span className="text-xs font-medium text-warning/90">Avg Congestion</span>
              </div>
              <p className="text-lg font-bold text-warning">{Math.round(analytics.averageCongestion)}%</p>
            </div>

            <div className="rounded-lg p-3 border border-border bg-success/10">
              <div className="flex items-center space-x-2 mb-1">
                <Target className="h-3 w-3 text-success" />
                <span className="text-xs font-medium text-success/90">Hotspots</span>
              </div>
              <p className="text-lg font-bold text-success">{analytics.topHotspots.length}</p>
            </div>

            <div className="rounded-lg p-3 border border-border bg-accent/10">
              <div className="flex items-center space-x-2 mb-1">
                <Route className="h-3 w-3 text-accent" />
                <span className="text-xs font-medium text-accent/90">Routes</span>
              </div>
              <p className="text-lg font-bold text-accent">{analytics.routeRecommendations.length}</p>
            </div>
          </div>

          {/* Peak Traffic Hours */}
          {analytics.peakTrafficHours.length > 0 && (
            <div className="rounded-lg p-3 border border-border bg-primary/10">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-primary">Peak Traffic Hours</h3>
              </div>
              <div className="space-y-2">
                {analytics.peakTrafficHours.slice(0, 5).map((hour: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-foreground/80">
                      {hour.hour}:00 - {hour.hour + 1}:00
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${hour.congestion}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-primary w-8">
                        {Math.round(hour.congestion)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Peak Traffic Days */}
          {analytics.peakTrafficDays.length > 0 && (
            <div className="rounded-lg p-3 border border-border bg-warning/10">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="h-4 w-4 text-warning" />
                <h3 className="text-sm font-semibold text-warning">Peak Traffic Days</h3>
              </div>
              <div className="space-y-2">
                {analytics.peakTrafficDays.map((day: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-foreground/80">{day.day}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-muted rounded-full h-2">
                        <div 
                          className="bg-warning h-2 rounded-full" 
                          style={{ width: `${day.congestion}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-warning w-8">
                        {Math.round(day.congestion)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nearby Hotspots */}
          {hotspots.length > 0 && (
            <div className="rounded-lg p-3 border border-border bg-accent/10">
              <div className="flex items-center space-x-2 mb-2">
                <MapPin className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-semibold text-accent">Nearby Hotspots</h3>
              </div>
              <div className="space-y-2">
                {hotspots.slice(0, 3).map((hotspot: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-surface rounded border border-border">
                    <div className="flex items-center space-x-2">
                      <div className={`p-1 rounded border ${getSeverityColor(hotspot.severity)}`}>
                        {getSeverityIcon(hotspot.severity)}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">{hotspot.name}</p>
                        <p className="text-xs text-foreground/60">
                          {hotspot.dataPoints} pts • {Math.round(hotspot.frequency * 100)}%
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-accent">{Math.round(hotspot.averageCongestion)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seasonal Trends */}
          {analytics.seasonalTrends.length > 0 && (
            <div className="rounded-lg p-3 border border-border bg-success/10">
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="h-4 w-4 text-success" />
                <h3 className="text-sm font-semibold text-success">Seasonal Trends</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {analytics.seasonalTrends.map((trend: any, index: number) => (
                  <div key={index} className="p-2 bg-surface rounded border border-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground capitalize">{trend.season}</span>
                      <span className="text-xs font-bold text-success">{Math.round(trend.averageCongestion)}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1">
                      <div 
                        className="bg-success h-1 rounded-full" 
                        style={{ width: `${trend.averageCongestion}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analytics.totalDataPoints === 0 && (
            <div className="text-center py-8 text-foreground/60">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm font-medium">No traffic data available yet</p>
              <p className="text-xs text-foreground/60 mt-1">
                Start using the app to collect traffic analysis data
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
