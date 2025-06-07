/**
 * TypeScript declarations for ChasquiFX API client
 */

// System service types
interface SystemService {
  checkApiStatus: () => Promise<boolean>;
  getStatus: () => Promise<{
    status: string;
    message?: string;
    [key: string]: any;
  }>;
  getDatabaseStatus: () => Promise<{
    status: string;
    message?: string;
    [key: string]: any;
  }>;
}

// Forex service types
interface ForexService {
  getExchangeRates: (baseCurrency: string) => Promise<{
    rates: Record<string, number>;
    timestamp: number;
  }>;
  convertCurrency: (
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ) => Promise<{
    amount: number;
    fromCurrency: string;
    toCurrency: string;
    convertedAmount: number;
    rate: number;
  }>;
}

// Recommendation service types
interface RecommendationService {
  getRecommendations: (
    origin: string,
    params?: {
      budget?: number;
      preferredCurrency?: string;
      travelDate?: string;
      returnDate?: string;
      [key: string]: any;
    }
  ) => Promise<any[]>;
  getUserHistory: (limit?: number, offset?: number) => Promise<any[]>;
  saveRecommendation: (recommendation: any, notes?: string) => Promise<any>;
}

// Flight service types
interface FlightService {
  getRoutes: (
    departureAirport: string,
    destinationAirport: string,
    outboundDate?: string | null,
    returnDate?: string | null
  ) => Promise<any>;
  searchFlights: (
    departureAirport: string,
    destinationAirport: string,
    outboundDate: string,
    returnDate?: string,
    passengers?: number
  ) => Promise<any[]>;
}

// User service types
interface UserService {
  saveSearch: (
    userId: string,
    searchQuery: string,
    results: any[]
  ) => Promise<any>;
  getUserSearches: (
    userId: string,
    limit?: number,
    offset?: number
  ) => Promise<any[]>;
  saveUserPreference: (
    userId: string,
    preferences: Record<string, any>
  ) => Promise<any>;
  getUserPreferences: (userId: string) => Promise<Record<string, any>>;
}

// Main API interface
interface ChasquiApi {
  systemService: SystemService;
  forexService: ForexService;
  recommendationService: RecommendationService;
  flightService: FlightService;
  userService: UserService;
}

// Session types
interface User {
  id: string;
  email: string;
  status?: boolean;
  [key: string]: any;
}

interface Session {
  user: User;
}

interface SessionResponse {
  session: Session | null;
}

declare module "./supabaseClient" {
  export function getSession(): Promise<SessionResponse>;
  export function signOutUser(): Promise<{ error: null }>;
  export function getUserRecommendations(userId: string): Promise<any[]>;
}

declare module "./chasquiApi" {
  const chasquiApi: ChasquiApi;
  export default chasquiApi;
}
