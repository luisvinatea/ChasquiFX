import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencySelect } from "./CurrencySelect";
import { Search } from "lucide-react";

export function SearchForm({ onSearch, onCurrencyChange }) {
  const [formData, setFormData] = React.useState({
    origin: "",
    destination: "",
    departureDate: "",
    returnDate: "",
    passengers: "1",
    originCurrency: "",
    destinationCurrency: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(formData);
  };

  const handleChange = (field, value) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);

    if (field === "originCurrency" || field === "destinationCurrency") {
      onCurrencyChange(newData.originCurrency, newData.destinationCurrency);
    }
  };

  const isFormValid =
    formData.origin &&
    formData.destination &&
    formData.departureDate &&
    formData.originCurrency &&
    formData.destinationCurrency;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Flight Search</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="origin">From</Label>
              <Input
                id="origin"
                placeholder="Origin city or airport"
                value={formData.origin}
                onChange={(e) => handleChange("origin", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="destination">To</Label>
              <Input
                id="destination"
                placeholder="Destination city or airport"
                value={formData.destination}
                onChange={(e) => handleChange("destination", e.target.value)}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="departureDate">Departure</Label>
              <Input
                id="departureDate"
                type="date"
                value={formData.departureDate}
                onChange={(e) => handleChange("departureDate", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="returnDate">Return (Optional)</Label>
              <Input
                id="returnDate"
                type="date"
                value={formData.returnDate}
                onChange={(e) => handleChange("returnDate", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="passengers">Passengers</Label>
              <Select
                value={formData.passengers}
                onValueChange={(value) => handleChange("passengers", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Passenger</SelectItem>
                  <SelectItem value="2">2 Passengers</SelectItem>
                  <SelectItem value="3">3 Passengers</SelectItem>
                  <SelectItem value="4">4 Passengers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Your Currency</Label>
              <CurrencySelect
                value={formData.originCurrency}
                onValueChange={(value) =>
                  handleChange("originCurrency", value)
                }
                placeholder="Select your currency"
              />
            </div>
            <div>
              <Label>Destination Currency</Label>
              <CurrencySelect
                value={formData.destinationCurrency}
                onValueChange={(value) =>
                  handleChange("destinationCurrency", value)
                }
                placeholder="Select destination currency"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={!isFormValid}>
            <Search className="mr-2 h-4 w-4" />
            Search Flights
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
