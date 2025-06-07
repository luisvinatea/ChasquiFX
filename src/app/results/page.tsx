"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FlightCard } from "@/components/results/FlightCard";
import { SearchSummary } from "@/components/results/SearchSummary";
import { SortingControls } from "@/components/results/SortingControls";
import { ArrowLeft } from "lucide-react";

function ResultsPageContent() {
  const searchParams = useSearchParams();
  const [flights, setFlights] = React.useState([]);
  const [searchData, setSearchData] = React.useState({});
  const [sortedFlights, setSortedFlights] = React.useState([]);
  const [sortBy, setSortBy] = React.useState("total-value");

  React.useEffect(() => {
    const dataParam = searchParams.get("data");
    if (dataParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(dataParam));
        setFlights(parsed.flights || []);
        setSearchData(parsed.searchData || {});
      } catch (error) {
        console.error("Error parsing results data:", error);
      }
    }
  }, [searchParams]);

  React.useEffect(() => {
    handleSort(sortBy);
  }, [flights, sortBy]);

  const handleSort = (criteria: string) => {
    const sorted = [...flights].sort((a: any, b: any) => {
      switch (criteria) {
        case "price":
          return a.priceInOriginCurrency - b.priceInOriginCurrency;
        case "forex":
          return b.forexAdvantage - a.forexAdvantage;
        case "savings":
          return b.totalSavings - a.totalSavings;
        case "total-value":
        default:
          const aValue = a.priceInOriginCurrency - a.totalSavings;
          const bValue = b.priceInOriginCurrency - b.totalSavings;
          return aValue - bValue;
      }
    });
    setSortedFlights(sorted);
    setSortBy(criteria);
  };

  if (!flights.length) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No Results Found</h1>
          <p className="text-muted-foreground mb-6">Please try a new search</p>
          <Button onClick={() => (window.location.href = "/search")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Search
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button
          variant="outline"
          className="mb-4"
          onClick={() => (window.location.href = "/search")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          New Search
        </Button>
        <h1 className="text-3xl font-bold mb-2">Flight Results</h1>
        <SearchSummary searchData={searchData} resultCount={flights.length} />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-1/4">
          <SortingControls sortBy={sortBy} onSortChange={handleSort} />
        </div>

        <div className="lg:w-3/4">
          <div className="space-y-4">
            {sortedFlights.map((flight: any) => (
              <FlightCard
                key={flight.id}
                flight={flight}
                searchData={searchData}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <ResultsPageContent />
    </React.Suspense>
  );
}
