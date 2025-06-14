import * as React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plane, TrendingUp, DollarSign, Globe } from "lucide-react";
import { ApiTestComponent } from "@/components/ApiTestComponent";
import Header from "@/components/Header";

export function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Smart Travel with Currency Intelligence
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Find flights that are both price advantageous and forex beneficial
          </p>
          <Link to="/search">
            <Button size="lg" className="text-lg px-8 py-6">
              <Plane className="mr-2 h-5 w-5" />
              Start Flight Search
            </Button>
          </Link>
        </div>

        {/* API Connection Test */}
        <div className="flex justify-center mb-8">
          <ApiTestComponent />
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <FeatureCard
            icon={<DollarSign className="h-8 w-8" />}
            title="Forex Analysis"
            description="Analyze currency overvaluations to find the best times to travel"
          />
          <FeatureCard
            icon={<TrendingUp className="h-8 w-8" />}
            title="Price Optimization"
            description="Compare flight prices across multiple currencies and booking regions"
          />
          <FeatureCard
            icon={<Globe className="h-8 w-8" />}
            title="Multi-Currency Support"
            description="Support for major currencies with real-time exchange rate analysis"
          />
        </div>

        {/* How It Works Section */}
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-4 text-sm">
            <StepCard
              number="1"
              title="Enter Trip Details"
              description="Select origin, destination, and travel dates"
            />
            <StepCard
              number="2"
              title="Currency Analysis"
              description="We analyze forex rates and overvaluations"
            />
            <StepCard
              number="3"
              title="Flight Search"
              description="Search across multiple flight APIs"
            />
            <StepCard
              number="4"
              title="Optimized Results"
              description="Get flights ranked by total value"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 text-primary">{icon}</div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-center">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );
}

interface StepCardProps {
  number: string;
  title: string;
  description: string;
}

function StepCard({ number, title, description }: StepCardProps) {
  return (
    <div className="text-center">
      <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
        {number}
      </div>
      <h3 className="font-medium mb-1">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
