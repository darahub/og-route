import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Brain, Zap, Clock, AlertTriangle, TrendingUp, Lightbulb, Star, Target, RefreshCcw } from 'lucide-react';
import { ZeroGComputeService } from '../services/0gComputeService';
import { ZeroGStorageService } from '../services/0gStorageService';
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
  
  // Default config (env overrides -> sensible fallbacks)
  const DEFAULT_PROVIDER = import.meta.env.VITE_DEFAULT_PROVIDER_ADDRESS || '0xf07240Efa67755B5311bc75784a061eDB47165Dd';
  const DEFAULT_MODEL = import.meta.env.VITE_DEFAULT_MODEL_NAME || 'distilbert-base-uncased';
  
  const [insights, setInsights] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalysisTime, setLastAnalysisTime] = useState<Date | null>(null);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const analyzeTraffic = async () => {
      // Only analyze if user has searched for a destination and we have route data
      if (!userLocation || !destination || !hasActiveRoute) {
        setInsights(null);
        setError(null);
        return;
      }

      // Debounce - wait 500ms before analyzing
      timeout = setTimeout(async () => {
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

        // Display results immediately
        setInsights(aiInsights);
        setLastAnalysisTime(currentTime);
        setIsAnalyzing(false);

        // Note: AI insights are now backed up periodically (every 6 hours) instead of immediately
        // This reduces blockchain transaction costs and prevents nonce conflicts

      } catch (error) {
        console.error('AI traffic analysis failed:', error);
        setError('AI analysis temporarily unavailable');
        setIsAnalyzing(false);
      }
      }, 500);
    };

    // Only analyze when user searches for a route (not continuously)
    analyzeTraffic();

    return () => clearTimeout(timeout);
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

  // Training UI state
  const [showTrainModal, setShowTrainModal] = useState(false);
  const [providerAddress, setProviderAddress] = useState<string>(DEFAULT_PROVIDER);
  const [modelName, setModelName] = useState<string>(DEFAULT_MODEL);
  const [trainSize, setTrainSize] = useState<number>(50);
  const [validationSize, setValidationSize] = useState<number>(20);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainResult, setTrainResult] = useState<any>(null);
  const [logContent, setLogContent] = useState<string>('');
  const [logError, setLogError] = useState<string>('');
  const [isRefreshingProvider, setIsRefreshingProvider] = useState<boolean>(false);
  // Status polling state
  const [isWatchingStatus, setIsWatchingStatus] = useState<boolean>(false);
  const [currentServingModel, setCurrentServingModel] = useState<string>('');
  const [pollError, setPollError] = useState<string>('');

  // Persist user overrides for provider/model
  useEffect(() => {
    const savedProvider = localStorage.getItem('zg-default-provider');
    const savedModel = localStorage.getItem('zg-default-model');
    if (savedProvider) setProviderAddress(savedProvider);
    if (savedModel) setModelName(savedModel);
  }, []);

  useEffect(() => {
    if (providerAddress) localStorage.setItem('zg-default-provider', providerAddress);
  }, [providerAddress]);

  useEffect(() => {
    if (modelName) localStorage.setItem('zg-default-model', modelName);
  }, [modelName]);

  // Lock body scroll when modal is open to prevent background interaction
  useEffect(() => {
    if (showTrainModal) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previous;
      };
    }
  }, [showTrainModal]);
  const refreshLog = async () => {
    setLogError('');
    if (!trainResult?.logFile) return;
    try {
      const content = await ZeroGComputeService.getTrainingLog(trainResult.logFile);
      setLogContent(content);
    } catch (e: any) {
      setLogError(e?.message || 'Failed to fetch training log');
    }
  };

  const refreshProvider = async () => {
    try {
      setIsRefreshingProvider(true);
      const services = await ZeroGComputeService.getAvailableServices();
      const latest = services && services[0]
        ? (services[0].provider || services[0].providerAddress || services[0].address)
        : null;
      const next = latest || DEFAULT_PROVIDER;
      setProviderAddress(next);
      if (next) localStorage.setItem('zg-default-provider', next);
    } catch (_e) {
      setProviderAddress(DEFAULT_PROVIDER);
      localStorage.setItem('zg-default-provider', DEFAULT_PROVIDER);
    } finally {
      setIsRefreshingProvider(false);
    }
  };

  // Poll provider metadata to detect when the model goes live
  const watchStatus = async () => {
    setPollError('');
    setIsWatchingStatus(true);
    setCurrentServingModel('');
    try {
      const res = await ZeroGComputeService.pollProviderModel(providerAddress, modelName, 5000, 5 * 60 * 1000);
      if (res.currentModel) setCurrentServingModel(res.currentModel);
      if (!res.live) setPollError('Model not live yet or timeout reached');
    } catch (e: any) {
      setPollError(e?.message || 'Status polling failed');
    } finally {
      setIsWatchingStatus(false);
    }
  };

  const startTraining = async () => {
    setIsTraining(true);
    setTrainResult(null);
    setLogContent('');
    setLogError('');
    try {
      const result = await ZeroGComputeService.trainTrafficModel(
        { provider: providerAddress, model: modelName, trainSize, validationSize }
      );
      setTrainResult(result);
      if (result?.logFile) {
        try {
          const content = await ZeroGComputeService.getTrainingLog(result.logFile);
          setLogContent(content);
        } catch (e: any) {
          setLogError(e?.message || 'Failed to fetch training log');
        }
      }
      if (result?.ok) {
        // Start watching provider status to detect when the model goes live
        watchStatus();
      }
    } catch (e: any) {
      setTrainResult({ ok: false, error: e?.message || 'Training failed' });
    } finally {
      setIsTraining(false);
    }
  };

  // Shared Training Modal renderer to avoid duplication
  const renderTrainModal = () => (
    showTrainModal ? (
      createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowTrainModal(false)}></div>
          <div className="relative z-[10000] w-full max-w-lg rounded-2xl p-6 border border-border bg-surface shadow-2xl">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-foreground">Train Traffic Model</h3>
            <p className="text-xs text-foreground/60">Build a small dataset from stored analyses and start fine-tuning via 0G.</p>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-foreground/60">Provider Address</label>
                <button
                  type="button"
                  onClick={refreshProvider}
                  disabled={isRefreshingProvider}
                  aria-label="Refresh provider address"
                  className="text-xs px-2 py-1 rounded-md border border-border bg-muted hover:bg-muted/70 flex items-center space-x-1"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  <span>{isRefreshingProvider ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              </div>
              <input
                type="text"
                value={providerAddress}
                onChange={(e) => setProviderAddress(e.target.value)}
                placeholder={DEFAULT_PROVIDER}
                className="mt-1 w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <p className="mt-1 text-[11px] text-foreground/50">Pre-filled with a default provider. Edit to override.</p>
            </div>
            <div>
              <label className="text-xs text-foreground/60">Model Name</label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder={DEFAULT_MODEL}
                className="mt-1 w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-foreground/60">Train Size</label>
                <input
                  type="number"
                  min={10}
                  value={trainSize}
                  onChange={(e) => setTrainSize(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="text-xs text-foreground/60">Validation Size</label>
                <input
                  type="number"
                  min={5}
                  value={validationSize}
                  onChange={(e) => setValidationSize(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end space-x-2">
            <button
              className="px-3 py-1.5 text-sm rounded-lg border border-border bg-muted hover:bg-muted/70"
              onClick={() => setShowTrainModal(false)}
            >
              Cancel
            </button>
            <button
              className="px-3 py-1.5 text-sm rounded-lg border border-accent bg-accent/10 hover:bg-accent/20"
              onClick={startTraining}
              disabled={isTraining || !providerAddress}
            >
              {isTraining ? 'Training...' : 'Start Training'}
            </button>
          </div>
          {trainResult && (
            <div className="mt-4 rounded-lg border border-border p-3">
              <p className="text-sm">
                Status: <span className={trainResult.ok ? 'text-success' : 'text-danger'}>{trainResult.ok ? 'OK' : 'Failed'}</span>
              </p>
              {trainResult?.tokenCount !== undefined && (
                <p className="text-xs text-foreground/60">Token Count: {trainResult.tokenCount}</p>
              )}
              {trainResult?.datasetHash && (
                <p className="text-xs text-foreground/60 break-all">Dataset Hash: {trainResult.datasetHash}</p>
              )}
              {trainResult?.logFile && (
                <div className="mt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-foreground/60">Training Log</p>
                    <button
                      className="px-2 py-1 text-xs rounded-md border border-border bg-muted hover:bg-muted/70"
                      onClick={refreshLog}
                    >
                      Refresh
                    </button>
                  </div>
                  <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-muted p-2 text-xs whitespace-pre-wrap">
                    {logError ? `Error: ${logError}` : (logContent || 'No log content yet.')}
                  </pre>
                </div>
              )}
              {/* Provider status polling and one-click switch */}
              <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-foreground/60">Provider Status</p>
                  <button
                    className="px-2 py-1 text-xs rounded-md border border-border bg-muted hover:bg-muted/70"
                    onClick={watchStatus}
                    disabled={isWatchingStatus}
                  >
                    {isWatchingStatus ? 'Watching...' : 'Watch status'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-foreground/60 break-all">Current model: {currentServingModel || 'Unknown'}</p>
                {pollError && (
                  <p className="text-xs text-danger mt-1">{pollError}</p>
                )}
                {currentServingModel && currentServingModel.toLowerCase() === modelName.toLowerCase() && (
                  <button
                    className="mt-3 w-full px-3 py-1.5 text-sm font-semibold rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    onClick={() => {
                      if (providerAddress) localStorage.setItem('zg-default-provider', providerAddress);
                      if (modelName) localStorage.setItem('zg-default-model', modelName);
                      setShowTrainModal(false);
                    }}
                    aria-label="Use this trained model"
                  >
                    Use this model
                  </button>
                )}
              </div>
              {trainResult?.error && (
                <p className="text-xs text-danger mt-2">{trainResult.error}</p>
              )}
            </div>
          )}
        </div>
      </div>,
      document.body
      )
    ) : null
  );

  if (!userLocation) {
    return (
      <>
        <div className={`card rounded-2xl p-4 sm:p-6 ${className}`}>
          <div className="text-center py-8 text-foreground/60">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm font-medium">Location Required for AI Analysis</p>
            <button
              className="mt-3 px-3 py-1.5 text-sm font-semibold rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              onClick={() => setShowTrainModal(true)}
              aria-label="Train traffic model"
            >
              Train Model
            </button>
          </div>
        </div>
        {renderTrainModal()}
      </>
    );
  }

  if (!hasActiveRoute || !destination) {
    return (
      <>
        <div className={`card rounded-2xl p-4 sm:p-6 ${className}`}>
          <div className="text-center py-8 text-foreground/60">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm font-medium">Search for a destination to get AI analysis</p>
            <p className="text-xs text-foreground/60 mt-1">AI will analyze your route and provide smart recommendations</p>
            <button
              className="mt-3 px-3 py-1.5 text-sm font-semibold rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              onClick={() => setShowTrainModal(true)}
              aria-label="Train traffic model"
            >
              Train Model
            </button>
          </div>
        </div>
        {renderTrainModal()}
      </>
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
        <button
          className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
          onClick={() => setShowTrainModal(true)}
          aria-label="Train traffic model"
        >
          Train Model
        </button>
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
      {/* Training Modal */}
      {renderTrainModal()}
    </div>
  );
};