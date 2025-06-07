import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plane, Clock, DollarSign } from "lucide-react";

export function FlightCard({ flight, searchData }) {
  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getForexBadgeColor = (advantage) => {
    if (advantage > 5) return "bg-green-100 text-green-800";
    if (advantage > 0) return "bg-blue-100 text-blue-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{flight.airline}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {flight.flightNumber}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {flight.priceInOriginCurrency} {searchData.originCurrency}
            </div>
            <div className="text-sm text-muted-foreground">
              {flight.price} {flight.currency}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Plane className="h-4 w-4" />
              <span>
                {flight.departureTime} - {flight.arrivalTime}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(flight.duration)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge className={getForexBadgeColor(flight.forexAdvantage)}>
              Forex: {flight.forexAdvantage.toFixed(1)}%
            </Badge>
            {flight.totalSavings > 0 && (
              <Badge variant="secondary">
                <DollarSign className="h-3 w-3 mr-1" />
                Save {flight.totalSavings} {searchData.originCurrency}
              </Badge>
            )}
          </div>

          <div className="flex justify-between items-center pt-2 border-t">
            <div className="text-sm text-muted-foreground">
              Total Value:{" "}
              {(flight.priceInOriginCurrency - flight.totalSavings).toFixed(0)}{" "}
              {searchData.originCurrency}
            </div>
            <Button>Select Flight</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
