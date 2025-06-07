import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ApiStatus {
  health: "loading" | "success" | "error";
  currencies: "loading" | "success" | "error";
  healthData?: any;
  currenciesCount?: number;
}

export function ApiTestComponent() {
  const [status, setStatus] = useState<ApiStatus>({
    health: "loading",
    currencies: "loading",
  });

  const testHealthEndpoint = async () => {
    setStatus((prev) => ({ ...prev, health: "loading" }));
    try {
      const response = await fetch("/api/health");
      const data = await response.json();
      setStatus((prev) => ({
        ...prev,
        health: "success",
        healthData: data,
      }));
    } catch (error) {
      console.error("Health API error:", error);
      setStatus((prev) => ({ ...prev, health: "error" }));
    }
  };

  const testCurrenciesEndpoint = async () => {
    setStatus((prev) => ({ ...prev, currencies: "loading" }));
    try {
      const response = await fetch("/api/currencies");
      const data = await response.json();
      setStatus((prev) => ({
        ...prev,
        currencies: "success",
        currenciesCount: data.length,
      }));
    } catch (error) {
      console.error("Currencies API error:", error);
      setStatus((prev) => ({ ...prev, currencies: "error" }));
    }
  };

  useEffect(() => {
    testHealthEndpoint();
    testCurrenciesEndpoint();
  }, []);

  const getStatusBadge = (status: "loading" | "success" | "error") => {
    switch (status) {
      case "loading":
        return <Badge variant="secondary">Loading...</Badge>;
      case "success":
        return (
          <Badge variant="default" className="bg-green-500">
            ✓ Connected
          </Badge>
        );
      case "error":
        return <Badge variant="destructive">✗ Error</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>API Connection Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span>Health API:</span>
          {getStatusBadge(status.health)}
        </div>

        <div className="flex items-center justify-between">
          <span>Currencies API:</span>
          {getStatusBadge(status.currencies)}
        </div>

        {status.healthData && (
          <div className="text-sm text-muted-foreground">
            Environment: {status.healthData.environment}
          </div>
        )}

        {status.currenciesCount && (
          <div className="text-sm text-muted-foreground">
            Currencies loaded: {status.currenciesCount}
          </div>
        )}

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={testHealthEndpoint}>
            Test Health
          </Button>
          <Button size="sm" variant="outline" onClick={testCurrenciesEndpoint}>
            Test Currencies
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
