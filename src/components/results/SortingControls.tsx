import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function SortingControls({ sortBy, onSortChange }) {
  const sortOptions = [
    { value: 'total-value', label: 'Best Value', description: 'Price + forex savings' },
    { value: 'price', label: 'Lowest Price', description: 'Base price only' },
    { value: 'forex', label: 'Best Forex', description: 'Highest forex advantage' },
    { value: 'savings', label: 'Most Savings', description: 'Highest potential savings' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sort Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sortOptions.map((option) => (
            <Button
              key={option.value}
              variant={sortBy === option.value ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={() => onSortChange(option.value)}
            >
              <div className="text-left">
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-muted-foreground">{option.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
