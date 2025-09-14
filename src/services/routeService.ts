import { GoogleMapsService } from './googleMapsService';
// Supabase integration disabled for now

export interface RouteRequest {
  origin: { lat: number; lng: number };
  destination: string;
  travelMode?: 'driving' | 'walking' | 'transit' | 'bicycling';
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  userId?: string;
}

export interface RouteResponse {
  routes: RouteResult[];
  status: 'success' | 'error';
  message?: string;
}

export interface RouteResult {
  id: string;
  name: string;
  distance: number;
  duration: number;
  durationWithTraffic: number;
  trafficDelay: number;
  trafficLevel: 'low' | 'moderate' | 'high' | 'severe';
  description: string;
  isRecommended: boolean;
  savings?: number;
  waypoints?: string[];
  polyline?: string;
  steps?: RouteStep[];
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
}

export class RouteService {
  private static googleMapsService = GoogleMapsService.getInstance();
  
  static async calculateRoutes(request: RouteRequest): Promise<RouteResponse> {
    try {
      // Use JavaScript SDK which properly handles CORS and browser environment
      return await this.calculateRoutesWithJSSDK(request);
    } catch (error) {
      console.error('Route calculation failed:', error);
      return {
        routes: [],
        status: 'error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  }

  /**
   * Calculate routes using Google Maps JavaScript SDK
   */
  static async calculateRoutesWithJSSDK(request: RouteRequest): Promise<RouteResponse> {
    try {
      // First, search for the destination to get coordinates and validate it exists
      let places;
      try {
        places = await this.googleMapsService.searchPlaces(request.destination);
        if (places.length === 0) {
          return {
            routes: [],
            status: 'error',
            message: `No results found for "${request.destination}". Please try a more specific location or check the spelling.`
          };
        }
      } catch (error) {
        console.error('Place search failed:', error);
        return {
          routes: [],
          status: 'error',
          message: 'Unable to search for destination. Please check your internet connection and try again.'
        };
      }

      const destinationPlace = places[0];
      console.log('Found destination:', destinationPlace.formatted_address);

      // Calculate directions using Google Maps JavaScript SDK
      let directionsResult;
      try {
        directionsResult = await this.googleMapsService.calculateDirections(
          request.origin,
          request.destination,
          {
            travelMode: this.getTravelMode(request.travelMode),
            avoidHighways: request.avoidHighways,
            avoidTolls: request.avoidTolls,
            provideRouteAlternatives: true
          }
        );
      } catch (error) {
        console.error('Directions calculation failed:', error);
        return {
          routes: [],
          status: 'error',
          message: 'Unable to calculate routes. Please try again or check if the destination is reachable by car.'
        };
      }

      if (directionsResult.status !== 'OK') {
        return {
          routes: [],
          status: 'error',
          message: this.getDirectionsErrorMessage(directionsResult.status)
        };
      }

      // Convert Google Maps routes to our format
      const routes: RouteResult[] = directionsResult.routes.map((route, index) => {
        const leg = route.legs[0]; // Assuming single leg for now
        const distance = leg.distance.value / 1609.34; // Convert meters to miles
        const duration = Math.round(leg.duration.value / 60); // Convert seconds to minutes
        const durationWithTraffic = leg.duration_in_traffic 
          ? Math.round(leg.duration_in_traffic.value / 60)
          : duration;
        const trafficDelay = Math.max(0, durationWithTraffic - duration);

        const trafficLevel = this.calculateTrafficLevel(trafficDelay, duration);
        const isRecommended = index === 0 && trafficLevel !== 'severe';

        return {
          id: `route-${index}`,
          name: route.summary || `Route ${index + 1}`,
          distance,
          duration,
          durationWithTraffic,
          trafficDelay,
          trafficLevel,
          description: this.generateRouteDescription(route, trafficLevel),
          isRecommended,
          savings: undefined, // Will be calculated after all routes are processed
          waypoints: this.extractWaypoints(route),
          polyline: route.overview_polyline.points,
          steps: leg.steps?.map(step => ({
            instruction: step.html_instructions ? this.cleanInstruction(step.html_instructions) : 'Continue',
            distance: step.distance.value / 1609.34,
            duration: step.duration.value / 60,
            startLocation: step.start_location,
            endLocation: step.end_location
          })) || []
        };
      });

      // Calculate savings for each route
      routes.forEach((route, index) => {
        if (route.isRecommended) {
          route.savings = this.calculateSavings(routes, index);
        }
      });

      // Analytics persistence disabled while Supabase is off

      return {
        routes,
        status: 'success'
      };
    } catch (error) {
      console.error('Route calculation failed:', error);
      return {
        routes: [],
        status: 'error',
        message: 'An unexpected error occurred while calculating routes. Please try again.'
      };
    }
  }

  private static getTravelMode(mode?: string): google.maps.TravelMode {
    switch (mode) {
      case 'walking': return google.maps.TravelMode.WALKING;
      case 'transit': return google.maps.TravelMode.TRANSIT;
      case 'bicycling': return google.maps.TravelMode.BICYCLING;
      default: return google.maps.TravelMode.DRIVING;
    }
  }

  private static getDirectionsErrorMessage(status: string): string {
    switch (status) {
      case 'NOT_FOUND':
        return 'One or more locations could not be found. Please check your destination and try again.';
      case 'ZERO_RESULTS':
        return 'No route could be found between these locations. Try a different destination or travel mode.';
      case 'MAX_WAYPOINTS_EXCEEDED':
        return 'Too many waypoints in the request. Please simplify your route.';
      case 'INVALID_REQUEST':
        return 'Invalid route request. Please check your input and try again.';
      case 'OVER_QUERY_LIMIT':
        return 'Service temporarily unavailable due to high demand. Please try again in a moment.';
      case 'REQUEST_DENIED':
        return 'Route service access denied. Please contact support.';
      case 'UNKNOWN_ERROR':
        return 'An unknown error occurred. Please try again.';
      default:
        return 'Unable to calculate routes. Please try again.';
    }
  }

  private static calculateTrafficLevel(trafficDelay: number, baseDuration: number): 'low' | 'moderate' | 'high' | 'severe' {
    const delayPercentage = (trafficDelay / baseDuration) * 100;
    
    if (delayPercentage >= 50) return 'severe';
    if (delayPercentage >= 25) return 'high';
    if (delayPercentage >= 10) return 'moderate';
    return 'low';
  }

  private static generateRouteDescription(route: any, trafficLevel: string): string {
    const summary = route.summary || 'Standard route';
    const trafficDescriptions = {
      severe: 'Heavy congestion expected',
      high: 'Moderate to heavy traffic',
      moderate: 'Some traffic delays',
      low: 'Light traffic conditions'
    };
    
    return `${summary} - ${trafficDescriptions[trafficLevel as keyof typeof trafficDescriptions]}`;
  }

  private static calculateSavings(routes: RouteResult[], currentIndex: number): number | undefined {
    if (routes.length <= 1) return undefined;
    
    const currentRoute = routes[currentIndex];
    const otherRoutes = routes.filter((_, index) => index !== currentIndex);
    const fastestOther = otherRoutes.reduce((fastest, route) => 
      route.durationWithTraffic < fastest.durationWithTraffic ? route : fastest
    );
    
    const savings = fastestOther.durationWithTraffic - currentRoute.durationWithTraffic;
    return savings > 0 ? Math.round(savings) : undefined;
  }

  // Removed unused helper: extractWaypointsFromSummary

  // Persistence disabled; keeping method removed

  private static extractWaypoints(route: any): string[] {
    // Extract major waypoints from the route summary
    const summary = route.summary || '';
    const waypoints = summary.split(' and ').filter((w: string) => w.length > 0);
    return waypoints.slice(0, 3); // Limit to 3 waypoints
  }

  private static cleanInstruction(htmlInstruction: string): string {
    // Remove HTML tags and clean up the instruction
    return htmlInstruction
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }

  // Get saved routes for a user
  static async getSavedRoutes(_userId: string): Promise<RouteResult[]> {
    // Supabase disabled; return empty
    return [];
  }

  // Delete a saved route
  static async deleteSavedRoute(_routeId: string): Promise<boolean> {
    // Supabase disabled; pretend success
    return true;
  }
}