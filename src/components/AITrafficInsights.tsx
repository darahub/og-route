import React, { useState, useEffect } from 'react';
import { Brain, Zap, Clock, AlertTriangle, TrendingUp, Lightbulb, Star, Target } from 'lucide-react';
import { ZeroGComputeService } from '../services/0gComputeService';
import { useGeolocation } from '../hooks/useGeolocation';

interface AITrafficInsightsProps {
  trafficData: any[];
  destination?: string;
  hasActiveRoute?: boolean;
  className?: string;
}

export const AITrafficInsights: React.FC<AITrafficInsightsProps> = ({ 
  trafficData, 
  destination, 
  hasActiveRoute = false,
  className = '' 
}) => {
  const { location: userLocation } = useGeolocation();
  const [insights, setInsights] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalysisTime, setLastAnalysisTime] = useState<Date | null>(null);

  useEffect(() => {
    const analyzeTraffic = async () => {
      // Only analyze if user has searched for a destination and we have route data
      if (!userLocation || !destination || !hasActiveRoute) {
        setInsights(null);
        setError(null);
        return;
      }

      console.log('AI analyzing route to:', destination);
      setIsAnalyzing(true);
      setError(null);

      try {
        const currentTime = new Date();
        const timeOfDay = currentTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });

        const analysisRequest = {
          currentTraffic: trafficData,
          userLocation,
          destination,
          timeOfDay,
          weatherConditions: 'clear' // You can integrate weather API later
        };

        const aiInsights = await ZeroGComputeService.analyzeTrafficConditions(analysisRequest);
        setInsights(aiInsights);
        setLastAnalysisTime(currentTime);
        
      } catch (error) {
        console.error('AI traffic analysis failed:', error);
        setError('AI analysis temporarily unavailable');
      } finally {
        setIsAnalyzing(false);
      }
    };

    // Only analyze when user searches for a route (not continuously)
    analyzeTraffic();
  }, [userLocation, destination, hasActiveRoute]); // Removed trafficData from dependencies



  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-success bg-success/10 border-success/30';
      case 'moderate': return 'text-warning bg-warning/10 border-warning/30';
      case 'high': return 'text-accent bg-accent/10 border-accent/30';
      case 'severe': return 'text-danger bg-danger/10 border-danger/30';
      default: return 'text-foreground/70 bg-muted/50 border-border';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'low': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'moderate': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'severe': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Brain className="h-4 w-4 text-gray-500" />;
    }
  };

  if (!userLocation) {
    return (
      <div className={`card rounded-2xl p-4 sm:p-6 ${className}`}>
        <div className="text-center py-8 text-foreground/60">
          <Brain className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm font-medium">Location Required for AI Analysis</p>
        </div>
      </div>
    );
  }

  if (!hasActiveRoute || !destination) {
    return (
      <div className={`card rounded-2xl p-4 sm:p-6 ${className}`}>
        <div className="text-center py-8 text-foreground/60">
          <Brain className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm font-medium">Search for a destination to get AI analysis</p>
          <p className="text-xs text-foreground/60 mt-1">AI will analyze your route and provide smart recommendations</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`card rounded-2xl p-4 sm:p-6 transition-all duration-300 hover:shadow-xl ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Brain className="h-6 w-6 sm:h-7 sm:w-7 text-accent" />
            {isAnalyzing && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse"></div>
            )}
          </div>
          <div>
            <h2 className="section-title">
              AI Traffic Insights
            </h2>
            <p className="text-xs text-foreground/60">
              {isAnalyzing ? 'Analyzing traffic conditions...' : `Analyzing route to ${destination}`}
            </p>
          </div>
        </div>
        
        {insights && (
          <div className="badge">
            <Target className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium">
              {Math.round(insights.confidence * 100)}% Confidence
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-sm text-foreground/80">{error}</span>
          </div>
        </div>
      )}

      {isAnalyzing ? (
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <div className="absolute inset-0 rounded-full h-8 w-8 border-t-2 border-pink-600 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <span className="text-sm text-foreground/60">AI analyzing traffic patterns...</span>
          </div>
        </div>
      ) : insights ? (
        <div className="space-y-6">
          {/* Current Situation */}
          <div className="bg-surface rounded-xl p-4 border border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Current Traffic Situation</h3>
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${getSeverityColor(insights.severity)}`}>
                {getSeverityIcon(insights.severity)}
                <span className="text-sm font-medium capitalize">{insights.severity}</span>
              </div>
            </div>
            <p className="text-sm text-foreground/80">{insights.summary}</p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-xl p-4 border border-border bg-primary/10">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-primary/90">Predicted Congestion</span>
              </div>
              <p className="text-2xl font-bold text-primary">{insights.predictedCongestion}%</p>
            </div>

            <div className="rounded-xl p-4 border border-border bg-success/10">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-4 w-4 text-success" />
                <span className="text-xs font-medium text-success/90">Best Time</span>
              </div>
              <p className="text-lg font-bold text-success">{insights.bestTimeToTravel}</p>
            </div>

            <div className="rounded-xl p-4 border border-border bg-warning/10 col-span-2 lg:col-span-1">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-xs font-medium text-warning/90">Estimated Delay</span>
              </div>
              <p className="text-2xl font-bold text-warning">+{insights.estimatedDelay} min</p>
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="rounded-xl p-4 border border-border bg-accent/10">
            <div className="flex items-center space-x-2 mb-3">
              <Lightbulb className="h-5 w-5 text-accent" />
              <h3 className="font-semibold text-accent">AI Recommendations</h3>
            </div>
            <div className="space-y-2">
              {insights.recommendations.map((recommendation: string, index: number) => (
                <div key={index} className="flex items-start space-x-2">
                  <Star className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground/80">{recommendation}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Route Alternatives Suggestion */}
          {insights.alternativeRoutesSuggestion && (
            <div className="rounded-xl p-4 border border-border bg-primary/10">
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-primary">Route Optimization</h3>
              </div>
              <p className="text-sm text-foreground/80">{insights.alternativeRoutesSuggestion}</p>
            </div>
          )}

          {/* Analysis Timestamp */}
          {lastAnalysisTime && (
            <div className="text-center">
              <p className="text-xs text-foreground/60">
                Last analyzed: {lastAnalysisTime.toLocaleTimeString()}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-foreground/60">
          <Brain className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm font-medium">Waiting for traffic data...</p>
        </div>
      )}
    </div>
  );
}; 