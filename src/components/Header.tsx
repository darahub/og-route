import React, { useState } from 'react';
import { MapPin, Moon, Sun, Settings, Bell, Zap, User, LogOut } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from './AuthModal';
import { Location } from '../types';

interface HeaderProps {
  userLocation: Location | null;
  lastUpdated: Date;
}

export const Header: React.FC<HeaderProps> = ({ userLocation, lastUpdated }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleAuthClick = () => {
    if (user) {
      setShowUserMenu(!showUserMenu);
    } else {
      setShowAuthModal(true);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
  };

  return (
    <>
      <header className="bg-surface/80 backdrop-blur-xl shadow-sm border-b border border-border/60 transition-all duration-300 sticky top-0 z-40">
        <div className="container">
          <div className="flex justify-between items-center h-18 sm:h-20 lg:h-24">
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
              <div className="flex items-center space-x-2 min-w-0 group">
                <div className="relative">
                  <MapPin className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg"></div>
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent truncate">
                    0G-Route
                  </h1>
                  <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                    <Zap className="h-3 w-3 text-yellow-500" />
                    <span>AI-Powered</span>
                  </div>
                </div>
              </div>
              {userLocation && (
                <div className="hidden md:flex items-center space-x-2 text-xs sm:text-sm text-foreground/70 min-w-0 bg-muted/50 rounded-full px-3 py-1 chip">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="truncate" title={userLocation.address || `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`}>
                    {userLocation.address || `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
              <div className="hidden lg:flex items-center text-xs text-foreground/60 mr-2 bg-muted/50 rounded-full px-3 py-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2"></div>
                <span className="whitespace-nowrap">Updated {lastUpdated.toLocaleTimeString()}</span>
              </div>
              
              <button className="btn-ghost relative group">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              </button>
              
              <button className="btn-ghost">
                <Settings className="h-4 w-4 sm:h-5 sm:w-5 hover:rotate-90 transition-transform duration-300" />
              </button>
              
              <button
                onClick={toggleTheme}
                className="btn-ghost relative overflow-hidden"
              >
                <div className="relative">
                  {theme === 'light' ? (
                    <Moon className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-300 hover:rotate-12" />
                  ) : (
                    <Sun className="h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-300 hover:rotate-180" />
                  )}
                </div>
              </button>

              <div className="relative">
                <button
                  onClick={handleAuthClick}
                  className="btn-ghost flex items-center space-x-2"
                >
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  {user && (
                    <span className="hidden sm:inline text-sm font-medium text-gray-700 dark:text-gray-300">
                      {user.email?.split('@')[0]}
                    </span>
                  )}
                </button>

                {showUserMenu && user && (
                  <div className="absolute right-0 mt-2 w-48 bg-surface rounded-lg shadow-lg border border-border py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-foreground/80 hover:bg-muted/60 flex items-center space-x-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>


            </div>
          </div>
        </div>
      </header>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  );
};