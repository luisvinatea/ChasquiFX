import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

export function RecentSearches() {
  const [searches, setSearches] = React.useState([]);

  React.useEffect(() => {
    fetchRecentSearches();
  }, []);

  const fetchRecentSearches = async () => {
    try {
      const response = await fetch('/api/flights/recent');
      const data = await response.json();
      setSearches(data);
    } catch (error) {
      console.error('Error fetching recent searches:', error);
    }
  };

  if (searches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Searches</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No recent searches</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Searches</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {searches.slice(0, 5).map((search) => (
            <div key={search.id} className="p-3 border rounded-lg">
              <div className="font-medium">
                {search.origin} → {search.destination}
              </div>
              <div className="text-sm text-muted-foreground">
                {format(new Date(search.departure_date), 'MMM dd, yyyy')}
              </div>
              <div className="text-xs text-muted-foreground">
                {search.origin_currency} → {search.destination_currency}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
