import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Currency {
  code: string;
  name: string;
  overvaluationPercentage: number;
}

export function CurrencyComparison() {
  const [currencies, setCurrencies] = React.useState<Currency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = React.useState("");

  React.useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    try {
      const response = await fetch("/api/currencies");
      const data = await response.json();
      setCurrencies(data);
    } catch (error) {
      console.error("Error fetching currencies:", error);
    }
  };

  const getOvervaluationColor = (percentage: number) => {
    if (percentage > 10) return "text-red-600";
    if (percentage > 0) return "text-orange-600";
    if (percentage > -10) return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Currency Overvaluation Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid gap-4">
            {currencies.map((currency) => (
              <div
                key={currency.code}
                className="flex justify-between items-center p-3 border rounded"
              >
                <div>
                  <div className="font-medium">{currency.code}</div>
                  <div className="text-sm text-muted-foreground">
                    {currency.name}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`font-medium ${getOvervaluationColor(
                      currency.overvaluationPercentage
                    )}`}
                  >
                    {currency.overvaluationPercentage > 0 ? "+" : ""}
                    {currency.overvaluationPercentage.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    vs fair value
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
