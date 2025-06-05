import * as React from 'react';
import { CurrencyComparison } from '@/components/analysis/CurrencyComparison';
import { ForexTrends } from '@/components/analysis/ForexTrends';
import { TravelRecommendations } from '@/components/analysis/TravelRecommendations';

export function AnalysisPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Currency Analysis</h1>
        <p className="text-muted-foreground">Analyze forex rates and travel opportunities</p>
      </div>

      <div className="space-y-8">
        <CurrencyComparison />
        <ForexTrends />
        <TravelRecommendations />
      </div>
    </div>
  );
}
