import { useState } from 'react';
import { Header } from './components/Header';
import { DestinationSearch } from './components/DestinationSearch';
// Removed TrafficList import
import { PredictionChart } from './components/PredictionChart';
import { AlternativeRoutes } from './components/AlternativeRoutes';
import { AITrafficInsights } from './components/AITrafficInsights';

import { InsightsPanel } from './components/InsightsPanel';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useGeolocation } from './hooks/useGeolocation';
import { useTrafficData } from './hooks/useTrafficData';
import { RouteResult } from './services/routeService';
import { MapPin, AlertCircle } from 'lucide-react';


function AppContent() {
  const { user } = useAuth();
  const { location: userLocation, error: locationError, refreshLocation, isRequestingLocation } = useGeolocation();
  const { trafficData, lastUpdated, isLoading: trafficLoading, error: trafficError, refreshTrafficData } = useTrafficData(userLocation);
  
  // Shared route state
  const [currentRoutes, setCurrentRoutes] = useState<RouteResult[]>([]);
  const [currentDestination, setCurrentDestination] = useState<string>('');
  const [hasSearchResults, setHasSearchResults] = useState(false);



  return (
    <div className="min-h-screen bg-background text-foreground transition-all duration-500">
      <Header userLocation={userLocation} lastUpdated={lastUpdated} />
      

      
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 pb-4 sm:pb-8">
        {/* Location Error */}
        {locationError && (
          <div className="mb-4 sm:mb-6 bg-danger/10 dark:bg-danger/15 border border-danger/30 rounded-xl p-3 sm:p-4 backdrop-blur-sm shadow-sm animate-slideInDown">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-danger flex-shrink-0" />
                </div>
                <div>
                  <span className="text-danger font-semibold text-sm sm:text-base">Location Access Required</span>
                  <p className="text-danger/80 text-xs sm:text-sm mt-1">
                    {locationError} Please enable location access for accurate traffic predictions and route planning.
                  </p>
                </div>
              </div>
              <button 
                onClick={refreshLocation}
                className="text-danger hover:text-danger/80 text-sm font-medium"
                disabled={isRequestingLocation}
              >
                {isRequestingLocation ? 'Trying...' : 'Try Again'}
              </button>
            </div>
          </div>
        )}

        {/* Traffic Data Error */}
        {trafficError && userLocation && (
          <div className="mb-4 sm:mb-6 bg-warning/10 border border-warning/30 rounded-xl p-3 sm:p-4 backdrop-blur-sm shadow-sm animate-slideInDown">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="p-1 bg-warning/15 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-warning flex-shrink-0" />
                </div>
                <div>
                  <span className="text-warning font-semibold text-sm sm:text-base">Traffic Data Issue</span>
                  <p className="text-warning/80 text-xs sm:text-sm mt-1">
                    {trafficError}
                  </p>
                </div>
              </div>
              <button 
                onClick={refreshTrafficData}
                className="text-warning hover:text-warning/80 text-sm font-medium"
                disabled={trafficLoading}
              >
                {trafficLoading ? 'Retrying...' : 'Retry'}
              </button>
            </div>
          </div>
        )}

        {/* Destination Search - Primary Feature */}
        <div className="mb-6 animate-fadeIn">
          <DestinationSearch 
            userLocation={userLocation} 
            onRoutesFound={setCurrentRoutes}
            onDestinationChange={setCurrentDestination}
            onSearchStateChange={setHasSearchResults}
          />
        </div>

        {/* Real Route Alternatives - Only show when there are search results */}
        {hasSearchResults && currentRoutes.length > 1 && (
          <div className="mb-6 animate-fadeIn" style={{ animationDelay: '100ms' }}>
            <AlternativeRoutes 
              routes={currentRoutes}
              destination={currentDestination}
              mainRoute={currentRoutes[0]} // First route is typically the main/recommended one
            />
          </div>
        )}



        {/* AI Traffic Insights - Only show when user has searched for a route */}
        <div className="mb-6 animate-fadeIn" style={{ animationDelay: '200ms' }}>
          <AITrafficInsights 
            trafficData={trafficData} 
            destination={currentDestination}
            hasActiveRoute={hasSearchResults && !!currentDestination}
          />
        </div>




        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Left: Prediction chart */}
          <div className="lg:col-span-8">
            <div className="animate-slideInLeft">
              <PredictionChart />
            </div>
          </div>

          {/* Right: Condensed insights panel only */}
          <div className="lg:col-span-4 space-y-4 sm:space-y-6">
            <div className="animate-slideInRight" style={{ animationDelay: '150ms' }}>
              <InsightsPanel />
            </div>
          </div>
        </div>



        {/* Enhanced No Location Fallback */}
        {!userLocation && !locationError && (
          <div className="mt-6 sm:mt-8 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl rounded-2xl p-6 sm:p-8 text-center shadow-xl border border-gray-200/50 dark:border-gray-800/50 animate-pulse">
            <div className="relative mb-4">
              <MapPin className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mx-auto" />
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-blue-500/20 rounded-full animate-ping"></div>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
              🌍 {isRequestingLocation ? 'Getting Your Location' : 'Loading Location Data'}
            </h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4">
              {isRequestingLocation 
                ? "We're detecting your location to provide personalized traffic predictions and route planning."
                : "Loading your saved location preferences and traffic data."
              }
            </p>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        )}

        {/* Sign in message at bottom */}
        {!user && (
          <div className="mt-6 sm:mt-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-800/50 p-4 sm:p-6 text-center animate-fadeIn">
            <div className="flex items-center justify-center space-x-3 py-4">
              <AlertCircle className="h-6 w-6 text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400">
                Sign in to see personalized route alternatives
              </span>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;