import * as React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FlightCard } from '@/components/results/FlightCard';
import { SearchSummary } from '@/components/results/SearchSummary';
import { SortingControls } from '@/components/results/SortingControls';
import { ArrowLeft } from 'lucide-react';

export function ResultsPage() {
  const location = useLocation();
  const { flights = [], searchData = {} } = location.state || {};
  const [sortedFlights, setSortedFlights] = React.useState(flights);
  const [sortBy, setSortBy] = React.useState('total-value');

  React.useEffect(() => {
    handleSort(sortBy);
  }, [flights, sortBy]);

  const handleSort = (criteria) => {
    const sorted = [...flights].sort((a, b) => {
      switch (criteria) {
        case 'price':
          return a.priceInOriginCurrency - b.priceInOriginCurrency;
        case 'forex':
          return b.forexAdvantage - a.forexAdvantage;
        case 'savings':
          return b.totalSavings - a.totalSavings;
        case 'total-value':
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
          <Link to="/search">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Search
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/search">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            New Search
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Flight Results</h1>
        <SearchSummary searchData={searchData} resultCount={flights.length} />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-1/4">
          <SortingControls sortBy={sortBy} onSortChange={handleSort} />
        </div>
        
        <div className="lg:w-3/4">
          <div className="space-y-4">
            {sortedFlights.map((flight) => (
              <FlightCard key={flight.id} flight={flight} searchData={searchData} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
