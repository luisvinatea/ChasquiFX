import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface CurrencyInfo {
  name: string;
  overvaluationPercentage: number;
}

interface CurrencyAnalysisData {
  forexAdvantage: number;
  origin: CurrencyInfo;
  destination: CurrencyInfo;
}

interface CurrencyAnalysisProps {
  originCurrency: string;
  destinationCurrency: string;
}

export function CurrencyAnalysis({
  originCurrency,
  destinationCurrency,
}: CurrencyAnalysisProps) {
  const [analysis, setAnalysis] = React.useState<CurrencyAnalysisData | null>(
    null
  );
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (originCurrency && destinationCurrency) {
      fetchAnalysis();
    } else {
      setAnalysis(null);
    }
  }, [originCurrency, destinationCurrency]);

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/currencies/${originCurrency}/${destinationCurrency}`
      );
      const data = await response.json();
      setAnalysis(data);
    } catch (error) {
      console.error("Error fetching currency analysis:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!originCurrency || !destinationCurrency) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Currency Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Select currencies to see forex analysis
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Currency Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Analyzing currencies...</p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Currency Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Failed to load analysis</p>
        </CardContent>
      </Card>
    );
  }

  const getAdvantageIcon = (advantage) => {
    if (advantage > 5)
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (advantage < -5)
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-yellow-500" />;
  };

  const getAdvantageColor = (advantage) => {
    if (advantage > 5) return "bg-green-100 text-green-800";
    if (advantage < -5) return "bg-red-100 text-red-800";
    return "bg-yellow-100 text-yellow-800";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Currency Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-medium">
            {originCurrency} → {destinationCurrency}
          </span>
          <Badge className={getAdvantageColor(analysis.forexAdvantage)}>
            {getAdvantageIcon(analysis.forexAdvantage)}
            {analysis.forexAdvantage.toFixed(1)}%
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{analysis.origin.name}</span>
            <span>
              {analysis.origin.overvaluationPercentage.toFixed(1)}% overvalued
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>{analysis.destination.name}</span>
            <span>
              {analysis.destination.overvaluationPercentage.toFixed(1)}%
              overvalued
            </span>
          </div>
        </div>

        <div className="pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            {analysis.recommendation === "favorable"
              ? "Favorable time to travel - your currency has an advantage!"
              : "Consider waiting or looking for price deals to offset forex disadvantage."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
