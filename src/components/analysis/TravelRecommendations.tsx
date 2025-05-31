import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function TravelRecommendations() {
  const [currencies, setCurrencies] = React.useState([]);

  React.useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    try {
      const response = await fetch('/api/currencies');
      const data = await response.json();
      setCurrencies(data);
    } catch (error) {
      console.error('Error fetching currencies:', error);
    }
  };

  const getRecommendations = () => {
    const overvalued = currencies.filter(c => c.overvaluationPercentage > 5);
    const undervalued = currencies.filter(c => c.overvaluationPercentage < -5);

    return {
      goodToTravel: undervalued.slice(0, 3),
      avoidTravel: overvalued.slice(0, 3)
    };
  };

  const recommendations = getRecommendations();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Travel Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="font-medium text-green-700 mb-3">Good Time to Visit</h3>
            <div className="space-y-2">
              {recommendations.goodToTravel.length === 0 ? (
                <p className="text-sm text-muted-foreground">No undervalued currencies found</p>
              ) : (
                recommendations.goodToTravel.map((currency) => (
                  <div key={currency.code} className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span className="font-medium">{currency.name}</span>
                    <Badge className="bg-green-100 text-green-800">
                      {currency.overvaluationPercentage.toFixed(1)}% undervalued
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h3 className="font-medium text-red-700 mb-3">Consider Waiting</h3>
            <div className="space-y-2">
              {recommendations.avoidTravel.length === 0 ? (
                <p className="text-sm text-muted-foreground">No significantly overvalued currencies found</p>
              ) : (
                recommendations.avoidTravel.map((currency) => (
                  <div key={currency.code} className="flex justify-between items-center p-2 bg-red-50 rounded">
                    <span className="font-medium">{currency.name}</span>
                    <Badge className="bg-red-100 text-red-800">
                      {currency.overvaluationPercentage.toFixed(1)}% overvalued
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
