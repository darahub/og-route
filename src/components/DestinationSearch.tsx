import React, { useState } from 'react';
import { Search, MapPin, Clock, Route, Navigation, AlertTriangle, Zap, ExternalLink, Loader } from 'lucide-react';
import { RouteService, RouteResult } from '../services/routeService';
import { NavigationService } from '../services/navigationService';
import { ZeroGStorageService } from '../services/0gStorageService';
import { useAuth } from '../contexts/AuthContext';

interface DestinationSearchProps {
  userLocation: { lat: number; lng: number } | null;
  onRoutesFound?: (routes: RouteResult[]) => void;
  onDestinationChange?: (destination: string) => void;
  onSearchStateChange?: (hasResults: boolean) => void;
}

export const DestinationSearch: React.FC<DestinationSearchProps> = ({ 
  userLocation, 
  onRoutesFound, 
  onDestinationChange, 
  onSearchStateChange 
}) => {
  const [destination, setDestination] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const handleSearch = async () => {
    if (!destination.trim() || !userLocation) {
      if (!destination.trim()) {
        setError('Please enter a destination');
      } else if (!userLocation) {
        setError('Location access is required for route calculation. Please enable location services.');
      }
      return;
    }

    console.log('Starting search for destination:', destination.trim());
    console.log('User location:', userLocation);

    setIsSearching(true);
    setShowResults(false);
    setError(null);

    try {
      const response = await RouteService.calculateRoutes({
        origin: userLocation,
        destination: destination.trim(),
        travelMode: 'driving',
        userId: user?.id
      });

      console.log('Route calculation response:', response);

      if (response.status === 'success') {
        if (response.routes.length === 0) {
          setError('No routes found. Please try a different destination or check if it\'s accessible by car.');
          onSearchStateChange?.(false);
        } else {
          setRoutes(response.routes);
          setShowResults(true);
          console.log('Found routes:', response.routes.length);

          // Notify parent component about the routes
          onRoutesFound?.(response.routes);
          onDestinationChange?.(destination.trim());
          onSearchStateChange?.(true);

          // Save to 0G Storage
          try {
            const routeData = {
              origin: userLocation,
              destination: destination.trim(),
              routes: response.routes,
              timestamp: new Date().toISOString()
            };
            const result = await ZeroGStorageService.saveRouteData(routeData);
            console.log('💾 Routes saved to 0G Storage:', result.rootHash);
          } catch (storageError) {
            console.error('Failed to save routes to 0G Storage:', storageError);
            // Don't show error to user, it's a background operation
          }
        }
      } else {
        console.error('Route calculation failed:', response.message);
        setError(response.message || 'Failed to calculate routes');
        onSearchStateChange?.(false);
      }
    } catch (error) {
      console.error('Error calculating routes:', error);
      setError('Network error. Please check your connection and try again.');
      onSearchStateChange?.(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const startNavigation = async (route: RouteResult) => {
    if (!userLocation) {
      alert('Location access is required for navigation');
      return;
    }

    try {
      const navigationApps = NavigationService.generateNavigationUrls({
        origin: userLocation,
        destination,
        waypoints: route.waypoints
      });

      showNavigationOptions(navigationApps, route);
    } catch (error) {
      console.error('Navigation error:', error);
      alert('Failed to open navigation. Please try again.');
    }
  };

  const showNavigationOptions = (options: any[], route: RouteResult) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
      <div class="bg-surface rounded-xl p-6 max-w-sm w-full shadow-2xl border border-border">
        <h3 class="text-lg font-semibold text-foreground mb-4">Choose Navigation App</h3>
        <p class="text-sm text-foreground/80 mb-4">Route: ${route.name} (${route.distance.toFixed(1)} mi, ~${route.durationWithTraffic} min)</p>
        <div class="space-y-3">
          ${options.map((option, index) => `
            <button data-app-index="${index}" class="nav-app-btn w-full flex items-center space-x-3 p-3 bg-muted/60 hover:bg-muted rounded-lg transition-colors duration-200">
              <span class="text-xl">${option.icon}</span>
              <span class="text-foreground font-medium">${option.name}</span>
              <svg class="h-4 w-4 text-foreground/50 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
              </svg>
            </button>
          `).join('')}
        </div>
        <button class="cancel-btn w-full mt-4 px-4 py-2 text-sm text-foreground/70 hover:text-foreground transition-colors duration-200">
          Cancel
        </button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    modal.querySelectorAll('.nav-app-btn').forEach((btn, index) => {
      btn.addEventListener('click', async () => {
        const success = await NavigationService.openNavigation(options[index]);
        if (success) {
          modal.remove();
        } else {
          alert('Failed to open navigation app. Please try again.');
        }
      });
    });

    modal.querySelector('.cancel-btn')?.addEventListener('click', () => {
      modal.remove();
    });
    
    // Remove modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  };

  const viewRouteDetails = (route: RouteResult) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
      <div class="bg-surface rounded-xl p-6 max-w-md w-full shadow-2xl border border-border max-h-[80vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-foreground">${route.name}</h3>
          <button class="close-btn text-foreground/50 hover:text-foreground">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        <div class="space-y-4">
          <div class="bg-muted/50 rounded-lg p-4">
            <h4 class="font-medium text-foreground mb-2">Route Overview</h4>
            <p class="text-sm text-foreground/80">${route.description}</p>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-primary/10 rounded-lg p-3">
              <div class="text-xs text-primary font-medium">Distance</div>
              <div class="text-lg font-bold text-primary/90">${route.distance.toFixed(1)} mi</div>
            </div>
            <div class="bg-success/10 rounded-lg p-3">
              <div class="text-xs text-success font-medium">Normal Time</div>
              <div class="text-lg font-bold text-success/90">${route.duration} min</div>
            </div>
            <div class="bg-warning/10 rounded-lg p-3">
              <div class="text-xs text-warning font-medium">With Traffic</div>
              <div class="text-lg font-bold text-warning/90">${route.durationWithTraffic} min</div>
            </div>
            <div class="bg-danger/10 rounded-lg p-3">
              <div class="text-xs text-danger font-medium">Delay</div>
              <div class="text-lg font-bold text-danger/90">+${route.trafficDelay} min</div>
            </div>
          </div>
          
          ${route.waypoints && route.waypoints.length > 0 ? `
            <div class="bg-muted/50 rounded-lg p-4">
              <h4 class="font-medium text-foreground mb-2">Route Waypoints</h4>
              <div class="space-y-2">
                ${route.waypoints.map((waypoint, index) => `
                  <div class="flex items-center space-x-2 text-sm">
                    <div class="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">${index + 1}</div>
                    <span class="text-foreground/80">${waypoint}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          ${route.steps && route.steps.length > 0 ? `
            <div class="bg-muted/50 rounded-lg p-4">
              <h4 class="font-medium text-foreground mb-2">Turn-by-Turn Directions</h4>
              <div class="space-y-2 max-h-40 overflow-y-auto">
                ${route.steps.slice(0, 5).map((step, index) => `
                  <div class="flex items-start space-x-2 text-sm">
                    <div class="w-5 h-5 bg-muted text-foreground/70 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">${index + 1}</div>
                    <div class="flex-1">
                      <div class="text-foreground/80">${step.instruction}</div>
                      <div class="text-xs text-foreground/60">${step.distance.toFixed(1)} mi • ${Math.round(step.duration)} min</div>
                    </div>
                  </div>
                `).join('')}
                ${route.steps.length > 5 ? `<div class="text-xs text-foreground/60 text-center">... and ${route.steps.length - 5} more steps</div>` : ''}
              </div>
            </div>
          ` : ''}
          
          <div class="bg-muted/50 rounded-lg p-4">
            <h4 class="font-medium text-foreground mb-2">Traffic Analysis</h4>
            <div class="flex items-center space-x-2 mb-2">
              <div class="w-3 h-3 ${getTrafficColor(route.trafficLevel).replace('text-', 'bg-').replace('dark:text-', 'dark:bg-')} rounded-full"></div>
              <span class="text-sm text-foreground/80 capitalize">${route.trafficLevel} Traffic</span>
            </div>
            <div class="w-full bg-muted rounded-full h-2 mb-2">
              <div class="flex h-2 rounded-full overflow-hidden">
                <div class="bg-success" style="width: ${(route.duration / route.durationWithTraffic) * 100}%"></div>
                <div class="bg-danger" style="width: ${(route.trafficDelay / route.durationWithTraffic) * 100}%"></div>
              </div>
            </div>
            <div class="flex justify-between text-xs text-foreground/60">
              <span>Normal (${route.duration} min)</span>
              <span>Traffic delay (+${route.trafficDelay} min)</span>
            </div>
          </div>
        </div>
        
        <div class="mt-6 flex space-x-3">
          <button class="close-btn flex-1 px-4 py-2 text-sm btn-secondary">
            Close
          </button>
          <button class="nav-btn flex-1 px-4 py-2 text-sm btn-primary">
            Start Navigation
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    modal.querySelectorAll('.close-btn').forEach(btn => {
      btn.addEventListener('click', () => modal.remove());
    });

    modal.querySelector('.nav-btn')?.addEventListener('click', () => {
      modal.remove();
      startNavigation(route);
    });
  };

  const getTrafficColor = (level: string) => {
    switch (level) {
      case 'severe': return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
      case 'high': return 'text-red-500 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
      case 'moderate': return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400';
      case 'low': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getTrafficIcon = (level: string) => {
    if (level === 'severe' || level === 'high') {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return <Route className="h-4 w-4" />;
  };

  return (
    <div className="card p-4 sm:p-6 transition-all duration-300 hover:shadow-xl rounded-2xl">
      {/* Search Header */}
      <div className="flex items-center space-x-3 mb-4 sm:mb-6">
        <div className="flex items-center space-x-2">
          <Navigation className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          <h2 className="section-title">
            Route Planner
          </h2>
        </div>
        {userLocation && (
          <div className="hidden sm:flex items-center space-x-1 text-xs text-foreground/60">
            <MapPin className="h-3 w-3" />
            <span>From current location</span>
          </div>
        )}
      </div>

      {/* Search Input */}
      <div className="relative mb-4 sm:mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-foreground/40" />
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter destination address..."
            disabled={!userLocation || isSearching}
            className="input pl-10 sm:pl-12 pr-32 py-3 sm:py-4 text-sm sm:text-base"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={!destination.trim() || !userLocation || isSearching}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 btn-primary text-sm font-medium"
        >
          {isSearching ? (
            <div className="flex items-center space-x-2">
              <Loader className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">Calculating...</span>
            </div>
          ) : (
            'Search'
          )}
        </button>
      </div>

      {/* Location Warning */}
      {!userLocation && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm text-amber-800 dark:text-amber-300">
              Location access required for route calculation
            </span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-800 dark:text-red-300">{error}</span>
          </div>
        </div>
      )}

      {/* Route Results */}
      {showResults && routes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
              Route Options to "{destination}"
            </h3>
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {routes.length} routes found
            </span>
          </div>

          <div className="space-y-3">
            {routes.map((route) => (
              <div
                key={route.id}
                className={`border rounded-lg p-4 transition-all duration-200 hover:shadow-md ${
                  route.isRecommended
                    ? 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
                        {route.name}
                      </h4>
                      {route.isRecommended && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <Zap className="h-3 w-3 mr-1" />
                          Best Choice
                        </span>
                      )}
                      {route.savings && route.savings > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          Save {route.savings} min
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-3">
                      {route.description}
                    </p>
                  </div>
                  <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ml-2 ${getTrafficColor(route.trafficLevel)}`}>
                    {getTrafficIcon(route.trafficLevel)}
                    <span className="capitalize">{route.trafficLevel}</span>
                  </span>
                </div>

                {/* Route Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3 text-sm">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-300">
                      {route.distance.toFixed(1)} mi
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-300">
                      {route.duration} min
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-gray-600 dark:text-gray-300">
                      {route.durationWithTraffic} min
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Route className="h-4 w-4 text-amber-400" />
                    <span className="text-gray-600 dark:text-gray-300">
                      +{route.trafficDelay} min delay
                    </span>
                  </div>
                </div>

                {/* Time Comparison */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Normal time</span>
                    <span>With current traffic</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="flex h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-green-500" 
                        style={{ width: `${(route.duration / route.durationWithTraffic) * 100}%` }}
                      ></div>
                      <div 
                        className="bg-red-500" 
                        style={{ width: `${(route.trafficDelay / route.durationWithTraffic) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button 
                    onClick={() => viewRouteDetails(route)}
                    className="flex-1 flex items-center justify-center space-x-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors duration-200"
                  >
                    <span>View Details</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                  <button 
                    onClick={() => startNavigation(route)}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors duration-200 font-medium flex items-center justify-center space-x-1"
                  >
                    <Navigation className="h-4 w-4" />
                    <span>Start Navigation</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Navigation className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Route Summary
              </span>
            </div>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <p>• Recommended route saves {routes.find(r => r.isRecommended)?.savings || 0} minutes compared to fastest route</p>
              <p>• Current traffic is adding an average of {Math.round(routes.reduce((sum, r) => sum + r.trafficDelay, 0) / routes.length)} minutes to travel time</p>
              <p>• Consider departing 15 minutes earlier to avoid peak traffic</p>
            </div>
          </div>
        </div>
      )}

      {/* No Results */}
      {showResults && routes.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No routes found for this destination</p>
          <p className="text-sm mt-1">Please try a different address</p>
        </div>
      )}
    </div>
  );
};