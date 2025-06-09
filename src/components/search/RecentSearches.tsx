import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatDateFns,
  sanitizeDateFields,
  debugDateIssues,
} from "@/lib/dateUtils";

interface Search {
  id: string;
  origin: string;
  destination: string;
  departure_date: string;
  origin_currency: string;
  destination_currency: string;
}

export function RecentSearches() {
  const [searches, setSearches] = React.useState<Search[]>([]);

  React.useEffect(() => {
    fetchRecentSearches();
  }, []);

  const fetchRecentSearches = async () => {
    try {
      const response = await fetch("/api/flights/recent");
      const data = await response.json();
      // Debug any date issues in the response
      debugDateIssues(data, "RecentSearches API response");
      // Sanitize the data to fix any invalid date values
      const sanitizedData = sanitizeDateFields(data);
      debugDateIssues(sanitizedData, "RecentSearches sanitized data");
      setSearches(sanitizedData);
    } catch (error) {
      console.error("Error fetching recent searches:", error);
    }
  };

  const formatSafeDate = (dateString: string) => {
    try {
      return formatDateFns(dateString, "MMM dd, yyyy", "Date not available");
    } catch (error) {
      console.warn("Error formatting date:", dateString, error);
      return "Date not available";
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
                {formatSafeDate(search.departure_date)}
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
