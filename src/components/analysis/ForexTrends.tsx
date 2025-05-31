import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ForexTrends() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Forex Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Forex trend analysis coming soon. This will show historical currency movements 
              and predict optimal travel timing.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
