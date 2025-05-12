"""
ChasquiForex Streamlit Demo
A simple interface to test the ChasquiForex API functionality
"""

import streamlit as st
import pandas as pd
import requests
import plotly.express as px
import sys
import os

# Add project root to path for imports
sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
)

# Define the API endpoint (assuming local development server)
API_BASE_URL = "http://localhost:8000"

# Page configuration
st.set_page_config(page_title="ChasquiForex Demo", layout="wide")


# Function to fetch recommendations from API
def get_recommendations(
    departure_airport, max_results=5, direct_only=False, use_realtime_data=True
):
    """Get destination recommendations from the API"""
    url = f"{API_BASE_URL}/recommendations"
    params = {
        "departure_airport": departure_airport,
        "max_results": max_results,
        "direct_only": direct_only,
        "use_realtime_data": use_realtime_data,
    }

    try:
        response = requests.get(url, params=params)
        if response.status_code == 200:
            return response.json()
        else:
            st.error(f"API Error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        st.error(f"Error connecting to API: {str(e)}")
        st.info(
            "Make sure the API server is running: python backend/api/main.py"
        )
        return None


# Main app
st.title("ChasquiForex Explorer")
st.write(
    "Find destinations with favorable exchange rates from your departure airport"
)

# Sidebar inputs
st.sidebar.header("Search Parameters")

# Airport selection
departure_airport = st.sidebar.text_input(
    "Departure Airport (IATA code)", value="JFK"
)

# Quick airport selection buttons
st.sidebar.subheader("Popular Airports")
col1, col2, col3 = st.sidebar.columns(3)
if col1.button("JFK"):
    departure_airport = "JFK"
    st.session_state.departure_airport = "JFK"
if col2.button("LHR"):
    departure_airport = "LHR"
    st.session_state.departure_airport = "LHR"
if col3.button("CDG"):
    departure_airport = "CDG"
    st.session_state.departure_airport = "CDG"

col1, col2, col3 = st.sidebar.columns(3)
if col1.button("SFO"):
    departure_airport = "SFO"
    st.session_state.departure_airport = "SFO"
if col2.button("NRT"):
    departure_airport = "NRT"
    st.session_state.departure_airport = "NRT"
if col3.button("MEX"):
    departure_airport = "MEX"
    st.session_state.departure_airport = "MEX"

# Options
max_results = st.sidebar.slider("Maximum Results", 1, 10, 5)
direct_only = st.sidebar.checkbox("Direct Flights Only", value=False)
use_realtime_data = st.sidebar.checkbox("Use Real-time Forex Data", value=True)

# Search button
if st.sidebar.button("Find Destinations", use_container_width=True):
    if not departure_airport or len(departure_airport) != 3:
        st.error("Please enter a valid 3-letter IATA airport code")
    else:
        with st.spinner(f"Finding destinations from {departure_airport}..."):
            data = get_recommendations(
                departure_airport.upper(),
                max_results,
                direct_only,
                use_realtime_data,
            )

            if data and data.get("recommendations"):
                # Display results
                st.success(
                    f"Found {len(data['recommendations'])} recommendations"
                )
                st.subheader(
                    f"Recommended Destinations from {departure_airport}"
                )
                st.info(f"Base Currency: {data['base_currency']}")

                # Create DataFrame for display
                recommendations = data["recommendations"]
                df = pd.DataFrame(
                    [
                        {
                            "Airport": r["arrival_airport"],
                            "City": r["city"],
                            "Country": r["country"],
                            "Exchange Rate": round(r["exchange_rate"], 4),
                            "Trend (%)": round(r["exchange_rate_trend"], 2),
                            "Score": round(r["score"], 1),
                        }
                        for r in recommendations
                    ]
                )

                # Display table
                st.dataframe(df, use_container_width=True)

                # Create visualizations
                if len(recommendations) > 1:
                    col1, col2 = st.columns(2)

                    # Exchange rate chart
                    with col1:
                        fig1 = px.bar(
                            df,
                            x="Airport",
                            y="Exchange Rate",
                            color="Country",
                            title="Exchange Rate by Destination",
                        )
                        st.plotly_chart(fig1, use_container_width=True)

                    # Trend chart
                    with col2:
                        fig2 = px.bar(
                            df,
                            x="Airport",
                            y="Trend (%)",
                            color="Score",
                            title="Exchange Rate Trend by Destination",
                            color_continuous_scale="RdYlGn",
                        )
                        st.plotly_chart(fig2, use_container_width=True)

                # Detailed information about each recommendation
                st.subheader("Detailed Information")
                for rec in recommendations:
                    with st.expander(
                        f"{rec['arrival_airport']} - {rec['city']}, {rec['country']}"
                    ):
                        col1, col2 = st.columns(2)

                        with col1:
                            st.metric(
                                "Exchange Rate", f"{rec['exchange_rate']:.4f}"
                            )
                            st.metric(
                                "Trend", f"{rec['exchange_rate_trend']:.2f}%"
                            )
                            st.metric("Score", f"{rec['score']:.1f}")

                        with col2:
                            st.subheader("Flight Route")
                            if rec["flight_route"]:
                                for key, value in rec["flight_route"].items():
                                    st.write(f"**{key}**: {value}")
                            else:
                                st.write(
                                    "No flight route information available"
                                )
            else:
                st.warning(
                    "No recommendations found. Try a different airport."
                )

# Default instructions (shown on initial load)
else:
    st.markdown("""
    ## How to use this app
    1. Enter a 3-letter departure airport code in the sidebar (e.g., JFK, LHR, CDG)
    2. Adjust maximum results, direct flights option, and real-time data preference
    3. Click "Find Destinations" to see recommendations
    
    **Make sure the ChasquiForex API server is running first!**
    
    Run the API server with:
    ```
    python backend/api/main.py
    ```
    
    Then run this demo with:
    ```
    streamlit run backend/samples/trial.py
    ```
    """)

# Footer
st.sidebar.markdown("---")
st.sidebar.caption("ChasquiForex Demo App")
st.sidebar.caption("Connects to localhost:8000 API")
