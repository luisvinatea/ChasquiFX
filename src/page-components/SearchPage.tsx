import * as React from "react";
import { useNavigate } from "react-router-dom";
import { SearchForm } from "@/components/search/SearchForm";
import { CurrencyAnalysis } from "@/components/search/CurrencyAnalysis";
import { RecentSearches } from "@/components/search/RecentSearches";
import { useAuth } from "@/contexts/AuthContext";

export function SearchPage() {
  const navigate = useNavigate();
  useAuth();
  const [selectedCurrencies, setSelectedCurrencies] = React.useState({
    origin: "",
    destination: "",
  });

  const handleSearch = async (searchData) => {
    console.log("Search submitted:", searchData);

    try {
      const response = await fetch("/api/flights/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(searchData),
      });

      if (response.ok) {
        const results = await response.json();
        navigate("/results", { state: { flights: results, searchData } });
      } else {
        console.error("Search failed");
      }
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  const handleCurrencyChange = (origin, destination) => {
    setSelectedCurrencies({ origin, destination });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Search Flights</h1>
        <p className="text-muted-foreground">
          Find the best flight deals with forex advantages
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <SearchForm
            onSearch={handleSearch}
            onCurrencyChange={handleCurrencyChange}
          />
        </div>
        <div className="space-y-6">
          <CurrencyAnalysis
            originCurrency={selectedCurrencies.origin}
            destinationCurrency={selectedCurrencies.destination}
          />
          <RecentSearches />
        </div>
      </div>
    </div>
  );
}
