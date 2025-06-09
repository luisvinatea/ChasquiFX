import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateFns } from "@/lib/dateUtils";

export function SearchSummary({ searchData, resultCount }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-medium">
            {searchData.origin} → {searchData.destination}
          </span>
          <span>
            {formatDateFns(searchData.departureDate)}
            {searchData.returnDate &&
              ` - ${formatDateFns(searchData.returnDate)}`}
          </span>
          <span>
            {searchData.passengers} passenger
            {searchData.passengers !== "1" ? "s" : ""}
          </span>
          <span>
            {searchData.originCurrency} → {searchData.destinationCurrency}
          </span>
          <span className="ml-auto font-medium">
            {resultCount} flights found
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
