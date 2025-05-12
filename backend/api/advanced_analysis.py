#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Advanced data analysis and visualization for ChasquiFX
This module provides additional analytical tools beyond the basic platform functionality
"""

import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from datetime import timedelta


class ForexAnalyzer:
    """Advanced forex data analysis and visualization"""

    def __init__(self, forex_data=None):
        """Initialize the analyzer

        Args:
            forex_data (pandas.DataFrame, optional): DataFrame of forex data.
                Will be loaded on demand if None.
        """
        self.forex_data = forex_data

    def set_data(self, forex_data):
        """Set or update the forex data

        Args:
            forex_data (pandas.DataFrame): DataFrame of forex data
        """
        self.forex_data = forex_data

    def calculate_volatility(self, currency_pair, window=30):
        """Calculate volatility (standard deviation) over specified window

        Args:
            currency_pair (str): Currency pair (e.g., "USD/EUR")
            window (int, optional): Rolling window size in days. Defaults to 30.

        Returns:
            pandas.DataFrame: DataFrame with date and volatility columns
        """
        if self.forex_data is None:
            raise ValueError("Forex data not loaded")

        # Filter data for the specified currency pair
        pair_data = self.forex_data[self.forex_data["pair"] == currency_pair]

        if pair_data.empty:
            raise ValueError(f"No data found for {currency_pair}")

        # Calculate rolling standard deviation
        pair_data = pair_data.sort_values("date")
        pair_data["volatility"] = (
            pair_data["rate"].rolling(window=window).std()
        )

        # Drop NaN values (first window-1 rows)
        pair_data = pair_data.dropna()

        return pair_data[["date", "volatility"]]

    def plot_volatility(self, currency_pair, window=30, height=400):
        """Create a volatility chart

        Args:
            currency_pair (str): Currency pair (e.g., "USD/EUR")
            window (int, optional): Rolling window size in days. Defaults to 30.
            height (int, optional): Plot height in pixels. Defaults to 400.

        Returns:
            plotly.graph_objects.Figure: Interactive volatility chart
        """
        volatility_data = self.calculate_volatility(currency_pair, window)

        fig = px.line(
            volatility_data,
            x="date",
            y="volatility",
            title=f"{currency_pair} Volatility (Rolling {window}-Day Standard Deviation)",
            height=height,
        )

        fig.update_layout(
            xaxis_title="Date",
            yaxis_title="Volatility",
            hovermode="x unified",
            template="plotly_white",
        )

        return fig

    def calculate_correlation_matrix(
        self, base_currency="USD", min_periods=10
    ):
        """Calculate correlation matrix between currency pairs with the same base

        Args:
            base_currency (str, optional): Base currency. Defaults to "USD".
            min_periods (int, optional): Minimum periods for calculation. Defaults to 10.

        Returns:
            pandas.DataFrame: Correlation matrix
        """
        if self.forex_data is None:
            raise ValueError("Forex data not loaded")

        # Filter data for pairs with the specified base currency
        filtered_data = self.forex_data[
            self.forex_data["pair"].str.startswith(base_currency + "/")
        ]

        if filtered_data.empty:
            raise ValueError(
                f"No data found for base currency {base_currency}"
            )

        # Pivot data to get rates by currency pair
        pivot_data = filtered_data.pivot(
            index="date", columns="pair", values="rate"
        )

        # Calculate correlation matrix
        corr_matrix = pivot_data.corr(min_periods=min_periods)

        return corr_matrix

    def plot_correlation_heatmap(
        self, base_currency="USD", min_periods=10, height=600
    ):
        """Create a correlation heatmap

        Args:
            base_currency (str, optional): Base currency. Defaults to "USD".
            min_periods (int, optional): Minimum periods for calculation. Defaults to 10.
            height (int, optional): Plot height in pixels. Defaults to 600.

        Returns:
            plotly.graph_objects.Figure: Interactive correlation heatmap
        """
        corr_matrix = self.calculate_correlation_matrix(
            base_currency, min_periods
        )

        fig = px.imshow(
            corr_matrix,
            text_auto=True,
            aspect="auto",
            color_continuous_scale="RdBu_r",
            title=f"Currency Pair Correlation Matrix (Base: {base_currency})",
            height=height,
        )

        fig.update_layout(
            xaxis_title="Currency Pair",
            yaxis_title="Currency Pair",
            template="plotly_white",
        )

        return fig

    def forecast_exchange_rate(
        self, currency_pair, days_ahead=30, method="sma", window=30
    ):
        """Simple forecast for exchange rates based on historical data

        Args:
            currency_pair (str): Currency pair (e.g., "USD/EUR")
            days_ahead (int, optional): Days to forecast. Defaults to 30.
            method (str, optional): Forecast method ('sma', 'ema', 'linear').
                Defaults to 'sma'.
            window (int, optional): Window size for moving averages. Defaults to 30.

        Returns:
            pandas.DataFrame: DataFrame with date and forecasted rate
        """
        if self.forex_data is None:
            raise ValueError("Forex data not loaded")

        # Filter data for the specified currency pair
        pair_data = self.forex_data[self.forex_data["pair"] == currency_pair]

        if pair_data.empty:
            raise ValueError(f"No data found for {currency_pair}")

        # Sort by date
        pair_data = pair_data.sort_values("date")

        # Get the latest date
        latest_date = pd.to_datetime(pair_data["date"]).max()

        # Generate future dates
        future_dates = [
            latest_date + timedelta(days=i + 1) for i in range(days_ahead)
        ]

        # Create forecast based on method
        if method == "sma":
            # Simple moving average
            forecast_value = pair_data["rate"].tail(window).mean()
            forecast_values = [forecast_value] * days_ahead

        elif method == "ema":
            # Exponential moving average
            forecast_value = pair_data["rate"].ewm(span=window).mean().iloc[-1]
            forecast_values = [forecast_value] * days_ahead

        elif method == "linear":
            # Linear regression (naive implementation)
            x = np.arange(len(pair_data)).reshape(-1, 1)
            y = pair_data["rate"].values

            # Simple linear regression
            slope = np.polyfit(x.flatten(), y, 1)[0]
            last_value = y[-1]

            # Forecast future values using the trend
            forecast_values = [
                last_value + slope * (i + 1) for i in range(days_ahead)
            ]

        else:
            raise ValueError(f"Unsupported forecast method: {method}")

        # Create forecast dataframe
        forecast_df = pd.DataFrame(
            {"date": future_dates, "rate": forecast_values, "type": "forecast"}
        )

        # Create historical dataframe (for plotting)
        historical_df = pd.DataFrame(
            {
                "date": pair_data["date"],
                "rate": pair_data["rate"],
                "type": "historical",
            }
        )

        # Combine historical and forecast data
        result_df = pd.concat([historical_df, forecast_df])

        return result_df

    def plot_forecast(
        self, currency_pair, days_ahead=30, method="sma", window=30, height=500
    ):
        """Create a forecast chart

        Args:
            currency_pair (str): Currency pair (e.g., "USD/EUR")
            days_ahead (int, optional): Days to forecast. Defaults to 30.
            method (str, optional): Forecast method ('sma', 'ema', 'linear').
                Defaults to 'sma'.
            window (int, optional): Window size for moving averages. Defaults to 30.
            height (int, optional): Plot height in pixels. Defaults to 500.

        Returns:
            plotly.graph_objects.Figure: Interactive forecast chart
        """
        forecast_data = self.forecast_exchange_rate(
            currency_pair, days_ahead, method, window
        )

        # Separate historical and forecast data
        historical = forecast_data[forecast_data["type"] == "historical"]
        forecast = forecast_data[forecast_data["type"] == "forecast"]

        # Create figure
        fig = go.Figure()

        # Add historical data
        fig.add_trace(
            go.Scatter(
                x=historical["date"],
                y=historical["rate"],
                name="Historical",
                line=dict(color="blue"),
                mode="lines",
            )
        )

        # Add forecast data
        fig.add_trace(
            go.Scatter(
                x=forecast["date"],
                y=forecast["rate"],
                name="Forecast",
                line=dict(color="red", dash="dash"),
                mode="lines",
            )
        )

        # Update layout
        fig.update_layout(
            title=f"{currency_pair} Exchange Rate Forecast ({method.upper()}, {days_ahead} days)",
            xaxis_title="Date",
            yaxis_title="Exchange Rate",
            height=height,
            template="plotly_white",
            hovermode="x unified",
            legend=dict(
                orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1
            ),
        )

        return fig

    def create_dashboard(self, currency_pair="USD/EUR", height=1000):
        """Create a comprehensive forex dashboard

        Args:
            currency_pair (str, optional): Currency pair. Defaults to "USD/EUR".
            height (int, optional): Total dashboard height in pixels. Defaults to 1000.

        Returns:
            plotly.graph_objects.Figure: Interactive dashboard with multiple charts
        """
        # Create subplot figure with 3 rows and 1 column
        fig = make_subplots(
            rows=3,
            cols=1,
            subplot_titles=(
                f"{currency_pair} Exchange Rate",
                f"{currency_pair} Volatility",
                f"{currency_pair} Rate Forecast",
            ),
            vertical_spacing=0.1,
            specs=[
                [{"type": "scatter"}],
                [{"type": "scatter"}],
                [{"type": "scatter"}],
            ],
        )

        # Filter data for the specified currency pair
        if self.forex_data is not None:
            pair_data = self.forex_data[
                self.forex_data["pair"] == currency_pair
            ].sort_values("date")

            if not pair_data.empty:
                # 1. Historical exchange rate
                fig.add_trace(
                    go.Scatter(
                        x=pair_data["date"],
                        y=pair_data["rate"],
                        name="Exchange Rate",
                        line=dict(color="blue"),
                    ),
                    row=1,
                    col=1,
                )

                # 2. Volatility (standard deviation)
                volatility_data = self.calculate_volatility(currency_pair)
                fig.add_trace(
                    go.Scatter(
                        x=volatility_data["date"],
                        y=volatility_data["volatility"],
                        name="Volatility",
                        line=dict(color="purple"),
                    ),
                    row=2,
                    col=1,
                )

                # 3. Forecast
                forecast_data = self.forecast_exchange_rate(currency_pair)
                historical = forecast_data[
                    forecast_data["type"] == "historical"
                ]
                forecast = forecast_data[forecast_data["type"] == "forecast"]

                fig.add_trace(
                    go.Scatter(
                        x=historical["date"],
                        y=historical["rate"],
                        name="Historical",
                        line=dict(color="blue"),
                        showlegend=False,
                    ),
                    row=3,
                    col=1,
                )

                fig.add_trace(
                    go.Scatter(
                        x=forecast["date"],
                        y=forecast["rate"],
                        name="Forecast",
                        line=dict(color="red", dash="dash"),
                    ),
                    row=3,
                    col=1,
                )

        # Update layout
        fig.update_layout(
            height=height,
            template="plotly_white",
            title=f"{currency_pair} Forex Analysis Dashboard",
            hovermode="x unified",
        )

        # Update x and y axes
        for i in range(1, 4):
            fig.update_xaxes(title_text="Date", row=i, col=1)

        fig.update_yaxes(title_text="Exchange Rate", row=1, col=1)
        fig.update_yaxes(title_text="Volatility", row=2, col=1)
        fig.update_yaxes(title_text="Exchange Rate", row=3, col=1)

        return fig


class TravelOptimizer:
    """Advanced optimization tools for travel recommendations"""

    def __init__(self, forex_data=None, flight_data=None):
        """Initialize the optimizer

        Args:
            forex_data (pandas.DataFrame, optional): DataFrame of forex data.
            flight_data (pandas.DataFrame, optional): DataFrame of flight data.
        """
        self.forex_data = forex_data
        self.flight_data = flight_data

    def set_data(self, forex_data=None, flight_data=None):
        """Set or update the data

        Args:
            forex_data (pandas.DataFrame, optional): DataFrame of forex data.
            flight_data (pandas.DataFrame, optional): DataFrame of flight data.
        """
        if forex_data is not None:
            self.forex_data = forex_data

        if flight_data is not None:
            self.flight_data = flight_data

    def calculate_travel_score(
        self,
        origin,
        destination,
        budget_weight=0.5,
        duration_weight=0.3,
        distance_weight=0.2,
    ):
        """Calculate a travel score for a destination

        The score is a weighted average of normalized:
        - Budget efficiency (exchange rate advantage)
        - Flight duration
        - Distance

        Args:
            origin (str): Origin location code
            destination (str): Destination location code
            budget_weight (float, optional): Weight for budget factor. Defaults to 0.5.
            duration_weight (float, optional): Weight for duration factor. Defaults to 0.3.
            distance_weight (float, optional): Weight for distance factor. Defaults to 0.2.

        Returns:
            float: Travel score (0-100, higher is better)
        """
        if self.forex_data is None or self.flight_data is None:
            raise ValueError("Forex and flight data must be loaded")

        # Filter flight data for the route
        route_data = self.flight_data[
            (self.flight_data["origin"] == origin)
            & (self.flight_data["destination"] == destination)
        ]

        if route_data.empty:
            raise ValueError(
                f"No flight data found for route {origin}-{destination}"
            )

        # Get currency codes
        origin_currency = route_data["origin_currency"].iloc[0]
        destination_currency = route_data["destination_currency"].iloc[0]

        # Get forex data for the currency pair
        forex_pair = f"{origin_currency}/{destination_currency}"
        pair_data = self.forex_data[self.forex_data["pair"] == forex_pair]

        if pair_data.empty:
            raise ValueError(f"No forex data found for pair {forex_pair}")

        # Get latest exchange rate
        latest_rate = pair_data.sort_values("date")["rate"].iloc[-1]

        # Calculate budget score (based on exchange rate compared to historical average)
        avg_rate = pair_data["rate"].mean()
        budget_score = min(100, max(0, 100 * (latest_rate / avg_rate)))

        # Flight duration score (lower is better)
        duration = route_data["duration_hours"].iloc[0]
        max_duration = 24  # Assume 24 hours as max flight duration
        duration_score = 100 - min(100, (duration / max_duration * 100))

        # Distance score (lower is better)
        distance = route_data["distance_km"].iloc[0]
        max_distance = 20000  # Assume 20000 km as max flight distance
        distance_score = 100 - min(100, (distance / max_distance * 100))

        # Calculate weighted score
        total_score = (
            budget_weight * budget_score
            + duration_weight * duration_score
            + distance_weight * distance_score
        )

        return total_score

    def find_optimal_destinations(
        self,
        origin,
        top_n=10,
        budget_weight=0.5,
        duration_weight=0.3,
        distance_weight=0.2,
    ):
        """Find optimal destinations from an origin

        Args:
            origin (str): Origin location code
            top_n (int, optional): Number of top destinations to return. Defaults to 10.
            budget_weight (float, optional): Weight for budget factor. Defaults to 0.5.
            duration_weight (float, optional): Weight for duration factor. Defaults to 0.3.
            distance_weight (float, optional): Weight for distance factor. Defaults to 0.2.

        Returns:
            pandas.DataFrame: Top destinations with scores and details
        """
        if self.forex_data is None or self.flight_data is None:
            raise ValueError("Forex and flight data must be loaded")

        # Filter flight data for the origin
        origin_flights = self.flight_data[self.flight_data["origin"] == origin]

        if origin_flights.empty:
            raise ValueError(f"No flight data found for origin {origin}")

        # Calculate scores for all destinations
        results = []

        for _, flight in origin_flights.iterrows():
            destination = flight["destination"]

            try:
                score = self.calculate_travel_score(
                    origin,
                    destination,
                    budget_weight,
                    duration_weight,
                    distance_weight,
                )

                results.append(
                    {
                        "destination": destination,
                        "destination_city": flight["destination_city"],
                        "destination_country": flight["destination_country"],
                        "destination_currency": flight["destination_currency"],
                        "travel_score": score,
                        "exchange_rate": flight["exchange_rate"],
                        "fare_usd": flight["fare_usd"],
                        "duration_hours": flight["duration_hours"],
                        "distance_km": flight["distance_km"],
                    }
                )

            except ValueError:
                # Skip destinations with missing data
                continue

        # Create DataFrame and sort by score
        results_df = pd.DataFrame(results)

        if results_df.empty:
            raise ValueError(
                f"No valid destinations found for origin {origin}"
            )

        # Sort by score (descending) and take top N
        results_df = results_df.sort_values(
            "travel_score", ascending=False
        ).head(top_n)

        return results_df

    def plot_destination_radar(self, origin, destinations=None, top_n=5):
        """Create a radar chart comparing destinations

        Args:
            origin (str): Origin location code
            destinations (list, optional): List of destination codes. If None,
                top destinations will be determined automatically.
            top_n (int, optional): Number of top destinations if destinations is None.
                Defaults to 5.

        Returns:
            plotly.graph_objects.Figure: Interactive radar chart
        """
        if destinations is None:
            # Find top destinations automatically
            top_destinations = self.find_optimal_destinations(
                origin, top_n=top_n
            )
            destinations = top_destinations["destination"].tolist()

        # Categories for radar chart
        categories = [
            "Exchange Rate",
            "Price",
            "Duration",
            "Distance",
            "Overall Score",
        ]

        # Create figure
        fig = go.Figure()

        for destination in destinations:
            # Filter flight data for the route
            if self.flight_data is None:
                continue

            route_data = self.flight_data[
                (self.flight_data["origin"] == origin)
                & (self.flight_data["destination"] == destination)
            ]

            if route_data.empty:
                continue

            # Calculate values for radar chart (normalized to 0-100)
            exchange_rate = route_data["exchange_rate"].iloc[0]
            fare = route_data["fare_usd"].iloc[0]
            duration = route_data["duration_hours"].iloc[0]
            distance = route_data["distance_km"].iloc[0]

            # Calculate travel score
            try:
                score = self.calculate_travel_score(origin, destination)
            except ValueError:
                score = 50  # Default score

            # Normalize values (higher is better)
            max_fare = 2000  # Assume $2000 as max fare
            max_duration = 24  # Assume 24 hours as max duration
            max_distance = 20000  # Assume 20000 km as max distance

            exchange_rate_score = min(
                100, exchange_rate * 20
            )  # Higher exchange rate is better
            price_score = 100 - min(
                100, (fare / max_fare * 100)
            )  # Lower fare is better
            duration_score = 100 - min(
                100, (duration / max_duration * 100)
            )  # Lower duration is better
            distance_score = 100 - min(
                100, (distance / max_distance * 100)
            )  # Lower distance is better

            # Values for radar chart
            values = [
                exchange_rate_score,
                price_score,
                duration_score,
                distance_score,
                score,
            ]

            # Add trace for this destination
            destination_name = route_data["destination_city"].iloc[0]

            fig.add_trace(
                go.Scatterpolar(
                    r=values,
                    theta=categories,
                    fill="toself",
                    name=destination_name,
                )
            )

        # Update layout
        fig.update_layout(
            polar=dict(radialaxis=dict(visible=True, range=[0, 100])),
            title=f"Destination Comparison from {origin}",
            showlegend=True,
            template="plotly_white",
        )

        return fig
