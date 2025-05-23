// Override the type definition for the specific function that's causing issues
declare module "../services/chasquiApi" {
  interface RecommendationService {
    getRecommendations(departureAirport: string): Promise<any[]>;
  }
}
