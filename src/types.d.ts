/**
 * TypeScript type declaration for chasquiApi.js
 * This provides proper typing for the API client without modifying original code
 */

declare module "../services/chasquiApi" {
  // System service
  interface SystemService {
    checkApiStatus(): Promise<boolean>;
    getStatus(): Promise<{
      status: string;
      message?: string;
      [key: string]: any;
    }>;
    getDatabaseStatus(): Promise<{
      status: string;
      message?: string;
      [key: string]: any;
    }>;
  }

  // Forex service
  interface ForexService {
    getExchangeRates(baseCurrency: string): Promise<{
      rates: Record<string, number>;
      timestamp: number;
    }>;
    convertCurrency(
      amount: number,
      fromCurrency: string,
      toCurrency: string
    ): Promise<{
      amount: number;
      fromCurrency: string;
      toCurrency: string;
      convertedAmount: number;
      rate: number;
    }>;
  }

  // Recommendation service
  interface RecommendationService {
    getRecommendations(
      params:
        | string
        | {
            departureAirport?: string;
            budget?: number;
            preferredCurrency?: string;
            travelDate?: string;
            returnDate?: string;
            [key: string]: any;
          }
    ): Promise<any[]>;
    getUserHistory(limit?: number, offset?: number): Promise<any[]>;
    saveRecommendation(recommendation: any, notes?: string): Promise<any>;
  }

  // Flight service
  interface FlightService {
    getRoutes(
      departureAirport: string,
      destinationAirport: string,
      outboundDate?: string | null,
      returnDate?: string | null
    ): Promise<any>;
    searchFlights(
      departureAirport: string,
      destinationAirport: string,
      outboundDate: string,
      returnDate?: string,
      passengers?: number
    ): Promise<any[]>;
  }

  // User service
  interface UserService {
    saveSearch(
      userId: string,
      searchQuery: string,
      results: any[]
    ): Promise<any>;
    getUserSearches(
      userId: string,
      limit?: number,
      offset?: number
    ): Promise<any[]>;
    saveUserPreference(
      userId: string,
      preferences: Record<string, any>
    ): Promise<any>;
    getUserPreferences(userId: string): Promise<Record<string, any>>;
  }

  interface ChasquiApi {
    systemService: SystemService;
    forexService: ForexService;
    recommendationService: RecommendationService;
    flightService: FlightService;
    userService: UserService;
  }

  const chasquiApi: ChasquiApi;
  export default chasquiApi;
}

/**
 * TypeScript type declaration for supabaseClient.js
 * Provides typing for compatibility layer functions
 */
declare module "../services/supabaseClient" {
  interface User {
    id: string;
    email: string;
    [key: string]: any;
  }

  interface Session {
    user: User;
  }

  interface SessionResponse {
    session: Session | null;
  }

  export function getSession(): Promise<SessionResponse>;
  export function signOutUser(): Promise<{ error: null }>;
  export function getUserRecommendations(userId: string): Promise<any[]>;
}
