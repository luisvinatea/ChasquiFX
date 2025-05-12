"""
ChasquiFX Streamlit Demo
A sophisticated interface for the ChasquiFX API with enhanced user experience
"""

import streamlit as st
import pandas as pd
import requests
import plotly.express as px
import plotly.graph_objects as go
import sys
import os
from datetime import datetime, timedelta
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("chasquifx_app.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger("ChasquiFX")

# Add project root to path for imports
sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
)

# Define the API endpoint (assuming local development server)
API_BASE_URL = "http://localhost:8000"

# Page configuration
st.set_page_config(
    page_title="ChasquiFX Explorer",
    page_icon="✈️",
    layout="wide",
    initial_sidebar_state="expanded",
    menu_items={
        "Get Help": "https://github.com/username/ChasquiFX",
        "Report a bug": "https://github.com/username/ChasquiFX/issues",
        "About": "ChasquiFX - Find destinations with favorable exchange rates",
    },
)

# Set Streamlit theme and styles
theme_bg_color = (
    "#0e1117" if st.get_option("theme.base") == "dark" else "#ffffff"
)

# Custom CSS to enhance UI
st.markdown(
    """
<style>
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
    }
    .stTabs [data-baseweb="tab"] {
        padding: 10px 20px;
        border-radius: 4px 4px 0px 0px;
    }
    .stTabs [aria-selected="true"] {
        background-color: rgba(0, 104, 201, 0.1);
        font-weight: bold;
    }
    div[data-testid="stMetricValue"] {
        font-size: 1.4rem;
    }
    div[data-testid="metric-container"] {
        background-color: rgba(28, 131, 225, 0.1);
        border: 1px solid rgba(28, 131, 225, 0.1);
        padding: 10px;
        border-radius: 5px;
        color: rgb(30, 103, 119);
        overflow-wrap: break-word;
    }
    div.stButton > button:first-child {
        font-weight: bold;
    }
    [data-testid="stSidebarNav"] {
        background-image: url('https://www.example.com/logo.png');
        background-repeat: no-repeat;
        padding-top: 80px;
        background-position: 20px 20px;
    }
</style>
""",
    unsafe_allow_html=True,
)


# Check if the API server is running
@st.cache_data(ttl=300)  # Cache for 5 minutes
def is_api_running():
    """Check if the API is running"""
    try:
        logger.info(f"Checking API connection at {API_BASE_URL}")
        response = requests.get(f"{API_BASE_URL}/", timeout=2)
        result = response.status_code == 200
        logger.info(
            f"API connection status: {'Connected' if result else 'Failed'}"
        )
        return result
    except Exception as e:
        logger.error(f"API connection error: {str(e)}")
        return False


# Function to fetch recommendations from API
def get_recommendations(
    departure_airport,
    max_results=5,
    direct_only=False,
    use_realtime_data=True,
    outbound_date=None,
    return_date=None,
    include_fares=True,
):
    """Get destination recommendations from the API"""
    url = f"{API_BASE_URL}/recommendations"
    params = {
        "departure_airport": departure_airport,
        "max_results": max_results,
        "direct_only": direct_only,
        "use_realtime_data": use_realtime_data,
        "include_fares": include_fares,
    }

    # Add optional date parameters if provided
    if outbound_date:
        params["outbound_date"] = outbound_date
    if return_date:
        params["return_date"] = return_date

    try:
        logger.info(
            f"Fetching recommendations for {departure_airport} with params: {params}"
        )
        with st.spinner("Fetching data from API..."):
            response = requests.get(url, params=params, timeout=15)

        if response.status_code == 200:
            data = response.json()
            rec_count = len(data.get("recommendations", []))
            logger.info(
                f"Successfully fetched {rec_count} recommendations for {departure_airport}"
            )
            return data
        else:
            error_msg = f"API Error: {response.status_code} - {response.text}"
            logger.error(error_msg)
            st.error(error_msg)
            return None
    except requests.exceptions.ConnectionError as e:
        error_msg = f"Cannot connect to API server: {str(e)}"
        logger.error(error_msg)
        st.error("Cannot connect to API server.")
        st.info(
            "Make sure the API server is running: python backend/api/main.py"
        )
        return None
    except requests.exceptions.Timeout as e:
        error_msg = f"API request timed out: {str(e)}"
        logger.error(error_msg)
        st.error("Request timed out. The API server might be overloaded.")
        return None
    except Exception as e:
        error_msg = f"API connection error: {str(e)}"
        logger.error(error_msg)
        st.error(f"Error connecting to API: {str(e)}")
        return None


# Function to get flight routes
@st.cache_data(ttl=600)  # Cache for 10 minutes
def get_routes(start_airport, end_airport):
    """Get flight route information between airports"""
    url = f"{API_BASE_URL}/routes/{start_airport}/{end_airport}"
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            return response.json()
        else:
            return None
    except Exception:
        return None


# Function to handle favorites
def save_favorite(destination):
    """Save a destination as favorite in session state"""
    if "favorites" not in st.session_state:
        st.session_state.favorites = []

    # Check if already in favorites
    if destination not in st.session_state.favorites:
        st.session_state.favorites.append(destination)
        logger.info(f"Added {destination} to favorites")
        return True
    return False


def remove_favorite(destination):
    """Remove a destination from favorites in session state"""
    if (
        "favorites" in st.session_state
        and destination in st.session_state.favorites
    ):
        st.session_state.favorites.remove(destination)
        logger.info(f"Removed {destination} from favorites")
        return True
    return False


# Initialize favorites if not exists
if "favorites" not in st.session_state:
    st.session_state.favorites = []

# Main app
st.title("ChasquiFX Explorer")
st.write(
    "Find destinations with favorable exchange rates from your departure airport"
)

# Initialize session state
if "departure_airport" not in st.session_state:
    st.session_state.departure_airport = "JFK"
if "api_status" not in st.session_state:
    st.session_state.api_status = False
if "last_refresh" not in st.session_state:
    st.session_state.last_refresh = datetime.now()

# Check API status
api_running = is_api_running()
st.session_state.api_status = api_running

# Sidebar for search parameters
st.sidebar.header("Search Parameters")

# API status indicator
if st.session_state.api_status:
    st.sidebar.success("✅ API Server Connected")
else:
    st.sidebar.error("❌ API Server Offline")
    st.sidebar.info("Run: python backend/api/main.py")

# Add refresh data button
refresh_col1, refresh_col2 = st.sidebar.columns([3, 1])
refresh_col1.caption(
    f"Last updated: {st.session_state.last_refresh.strftime('%H:%M:%S')}"
)
if refresh_col2.button("🔄", help="Refresh data and clear cache"):
    logger.info("Clearing cache and refreshing data")
    st.cache_data.clear()
    st.session_state.last_refresh = datetime.now()
    st.rerun()

# Airport selection
departure_airport = st.sidebar.text_input(
    "Departure Airport (IATA code)", value=st.session_state.departure_airport
).upper()

# Store the value in session state
st.session_state.departure_airport = departure_airport

# Quick airport selection buttons
st.sidebar.subheader("Popular Airports")
# First row of airport buttons
col1, col2, col3 = st.sidebar.columns(3)
if col1.button("🇺🇸 JFK"):
    st.session_state.departure_airport = "JFK"
    st.rerun()
if col2.button("🇬🇧 LHR"):
    st.session_state.departure_airport = "LHR"
    st.rerun()
if col3.button("🇫🇷 CDG"):
    st.session_state.departure_airport = "CDG"
    st.rerun()

# Second row of airport buttons
col1, col2, col3 = st.sidebar.columns(3)
if col1.button("🇺🇸 SFO"):
    st.session_state.departure_airport = "SFO"
    st.rerun()
if col2.button("🇯🇵 NRT"):
    st.session_state.departure_airport = "NRT"
    st.rerun()
if col3.button("🇲🇽 MEX"):
    st.session_state.departure_airport = "MEX"
    st.rerun()

# Travel dates section
st.sidebar.subheader("Travel Dates")
today = datetime.now()
default_outbound = today + timedelta(days=90)  # 3 months from now
default_return = default_outbound + timedelta(days=7)  # 1 week stay

# Date inputs
outbound_date = st.sidebar.date_input(
    "Outbound Date", value=default_outbound, min_value=today
)
return_date = st.sidebar.date_input(
    "Return Date", value=default_return, min_value=outbound_date
)

# Format dates for API
outbound_str = outbound_date.strftime("%Y-%m-%d")
return_str = return_date.strftime("%Y-%m-%d")

# Search parameters
st.sidebar.subheader("Options")
max_results = st.sidebar.slider("Maximum Results", 1, 10, 5)
direct_only = st.sidebar.checkbox("Direct Flights Only", value=False)
use_realtime_data = st.sidebar.checkbox("Use Real-time Forex Data", value=True)
include_fares = st.sidebar.checkbox("Include Flight Fares", value=True)

# Search button with progress animation
search_button = st.sidebar.button(
    "Find Destinations 🔍", use_container_width=True, type="primary"
)

if search_button:
    if not departure_airport or len(departure_airport) != 3:
        st.error("Please enter a valid 3-letter IATA airport code")
    elif not st.session_state.api_status:
        st.error(
            "API server is not running. Please start the API server first."
        )
        with st.expander("How to start the API server"):
            st.code(
                "cd /home/luisvinatea/DEVinatea/Repos/ChasquiFX\npython backend/api/main.py",
                language="bash",
            )
            st.info(
                "After starting the API server, click the '🔄' refresh button in the sidebar to reconnect."
            )
    else:
        with st.spinner(f"Finding destinations from {departure_airport}..."):
            data = get_recommendations(
                departure_airport.upper(),
                max_results,
                direct_only,
                use_realtime_data,
                outbound_str,
                return_str,
                include_fares,
            )

            if data and data.get("recommendations"):
                # Display results
                recommendations_count = len(data["recommendations"])
                st.success(
                    f"✨ Found {recommendations_count} recommendations!"
                )

                # Create tabs for different views
                tab1, tab2, tab3 = st.tabs(
                    ["Summary", "Details", "Comparison"]
                )

                # Tab 1: Summary view
                with tab1:
                    st.subheader(
                        f"Recommended Destinations from {departure_airport}"
                    )
                    st.info(f"💱 Base Currency: {data['base_currency']}")

                    # Create DataFrame for display with improved formatting
                    recommendations = data["recommendations"]
                    df = pd.DataFrame(
                        [
                            {
                                "Airport": r["arrival_airport"],
                                "City": r["city"],
                                "Country": r["country"],
                                "Exchange Rate": round(r["exchange_rate"], 4),
                                "Trend (%)": round(
                                    r["exchange_rate_trend"], 2
                                ),
                                "Score": round(r["score"], 1),
                                # Add fare info if available
                                "Flight Price": f"{r['fare']['price']} {r['fare']['currency']}"
                                if r.get("fare")
                                else "N/A",
                            }
                            for r in recommendations
                        ]
                    )

                    # Display table with highlighting
                    st.dataframe(
                        df.style.highlight_max(
                            subset=["Score"], color="lightgreen"
                        )
                        .highlight_min(subset=["Score"], color="lightpink")
                        .format(
                            {
                                "Exchange Rate": "{:.4f}",
                                "Score": "{:.1f}",
                                "Trend (%)": "{:+.2f}%",
                            }
                        ),
                        use_container_width=True,
                        column_config={
                            "Airport": st.column_config.TextColumn(
                                "Airport Code", help="IATA airport code"
                            ),
                            "Score": st.column_config.ProgressColumn(
                                "Score",
                                format="{:.1f}",
                                min_value=0,
                                max_value=100,
                            ),
                            "Trend (%)": st.column_config.NumberColumn(
                                "Trend", format="{:+.2f}%"
                            ),
                        },
                    )

                    # Add CSV download button
                    csv_data = df.to_csv(index=False).encode("utf-8")
                    export_col1, export_col2 = st.columns([4, 1])
                    export_col1.caption("Download results as CSV")
                    export_col2.download_button(
                        label="📥 CSV",
                        data=csv_data,
                        file_name=f"ChasquiFX_{departure_airport}_{datetime.now().strftime('%Y%m%d')}.csv",
                        mime="text/csv",
                    )

                    # Create visualizations
                    if len(recommendations) > 1:
                        col1, col2 = st.columns(2)

                        # Exchange rate chart with improved styling
                        with col1:
                            fig1 = px.bar(
                                df,
                                x="Airport",
                                y="Exchange Rate",
                                color="Country",
                                title="Exchange Rate by Destination",
                                labels={
                                    "Exchange Rate": "Exchange Rate (Base Currency)"
                                },
                                hover_data=["City", "Country", "Trend (%)"],
                                template="plotly_white",
                            )
                            fig1.update_layout(legend_title_text="Country")
                            st.plotly_chart(fig1, use_container_width=True)

                        # Trend chart with improved styling
                        with col2:
                            fig2 = px.bar(
                                df,
                                x="Airport",
                                y="Trend (%)",
                                color="Score",
                                title="Exchange Rate Trend by Destination",
                                color_continuous_scale="RdYlGn",
                                labels={
                                    "Trend (%)": "Exchange Rate Trend (%)"
                                },
                                hover_data=[
                                    "City",
                                    "Country",
                                    "Exchange Rate",
                                ],
                                template="plotly_white",
                            )
                            fig2.update_layout(
                                coloraxis_colorbar_title="Score"
                            )
                            st.plotly_chart(fig2, use_container_width=True)

                # Tab 2: Detailed information
                with tab2:
                    for i, rec in enumerate(recommendations):
                        # Create a nice card-like container for each recommendation
                        with st.container(border=True):
                            # Title with rank and favorite button
                            rank = i + 1
                            trend_icon = (
                                "📈"
                                if rec["exchange_rate_trend"] > 0
                                else "📉"
                                if rec["exchange_rate_trend"] < 0
                                else "➡️"
                            )

                            title_col1, title_col2 = st.columns([5, 1])

                            destination_text = f"{rec['arrival_airport']} - {rec['city']}, {rec['country']}"
                            title_col1.subheader(
                                f"{rank}. {destination_text} {trend_icon}"
                            )

                            # Favorite button
                            fav_key = (
                                f"{rec['arrival_airport']}-{rec['country']}"
                            )
                            is_favorite = fav_key in st.session_state.favorites
                            fav_btn_label = "★" if is_favorite else "☆"
                            fav_btn_help = (
                                "Remove from favorites"
                                if is_favorite
                                else "Add to favorites"
                            )

                            if title_col2.button(
                                fav_btn_label,
                                key=f"fav_{i}",
                                help=fav_btn_help,
                            ):
                                if is_favorite:
                                    remove_favorite(fav_key)
                                else:
                                    save_favorite(fav_key)
                                st.rerun()

                            # Three columns layout
                            col1, col2, col3 = st.columns([2, 2, 3])

                            # Column 1: Forex info
                            with col1:
                                st.markdown("#### Currency Info")
                                st.metric(
                                    "Exchange Rate",
                                    f"{rec['exchange_rate']:.4f}",
                                    delta=f"{rec['exchange_rate_trend']:.2f}%",
                                    delta_color="normal",
                                )
                                st.metric("Score", f"{rec['score']:.1f}")

                            # Column 2: Flight info
                            with col2:
                                st.markdown("#### Flight Route")
                                if rec["flight_route"]:
                                    if "Airlines" in rec["flight_route"]:
                                        st.write(
                                            f"**Airlines**: {rec['flight_route']['Airlines']}"
                                        )
                                    if "Stops" in rec["flight_route"]:
                                        st.write(
                                            f"**Stops**: {rec['flight_route']['Stops']}"
                                        )
                                    if "Equipment" in rec["flight_route"]:
                                        st.write(
                                            f"**Aircraft**: {rec['flight_route']['Equipment']}"
                                        )
                                else:
                                    st.write("No route information available")

                            # Column 3: Fare info
                            with col3:
                                st.markdown("#### Fare Details")
                                if rec.get("fare"):
                                    fare = rec["fare"]
                                    st.metric(
                                        "Ticket Price",
                                        f"{fare['price']} {fare['currency']}",
                                    )
                                    if fare.get("airlines"):
                                        st.write(
                                            f"**Airlines**: {', '.join(fare['airlines'])}"
                                        )
                                    if fare.get("duration"):
                                        st.write(
                                            f"**Duration**: {fare['duration']}"
                                        )
                                    st.caption(
                                        f"Outbound: {fare['outbound_date']} | Return: {fare['return_date']}"
                                    )
                                else:
                                    st.write("No fare information available")

                            # Get more route information button (only if API is running)
                            if st.session_state.api_status and st.button(
                                f"🔍 View Complete Routes for {rec['arrival_airport']}",
                                key=f"route_btn_{i}",
                            ):
                                route_data = get_routes(
                                    departure_airport, rec["arrival_airport"]
                                )
                                if route_data:
                                    st.subheader("Available Routes")

                                    # Direct routes
                                    if route_data.get("direct_routes"):
                                        with st.expander(
                                            "Direct Routes", expanded=True
                                        ):
                                            dr_df = pd.DataFrame(
                                                route_data["direct_routes"]
                                            )
                                            st.dataframe(dr_df)

                                    # One-stop routes
                                    if route_data.get("one_stop_routes"):
                                        with st.expander(
                                            f"One-Stop Routes ({len(route_data['one_stop_routes'])})"
                                        ):
                                            os_df = pd.DataFrame(
                                                route_data["one_stop_routes"]
                                            )
                                            st.dataframe(os_df)

                                    # Two-stop routes
                                    if route_data.get("two_stop_routes"):
                                        with st.expander(
                                            f"Two-Stop Routes ({len(route_data['two_stop_routes'])})"
                                        ):
                                            ts_df = pd.DataFrame(
                                                route_data["two_stop_routes"]
                                            )
                                            st.dataframe(ts_df)
                                else:
                                    st.error("Could not fetch route data")

                # Tab 3: Comparison view
                with tab3:
                    # Create a radar chart to compare destinations
                    if len(recommendations) > 1:
                        st.subheader("Destination Comparison")

                        # Create radar chart data
                        fig = go.Figure()

                        # Categories for radar chart
                        categories = [
                            "Exchange Rate",
                            "Trend",
                            "Flight Quality",
                            "Fare Value",
                            "Overall Score",
                        ]

                        for rec in recommendations:
                            # Normalize values for radar chart
                            exchange_rate_norm = min(
                                100, rec["exchange_rate"] * 10
                            )  # Normalize exchange rate
                            trend_norm = (
                                rec["exchange_rate_trend"] + 10
                            ) * 5  # Shift from -10% to +10% to 0-100
                            route_quality = (
                                100
                                if rec["flight_route"].get("Stops", "0") == "0"
                                else 70
                                if rec["flight_route"].get("Stops", "2") == "1"
                                else 40
                            )

                            # Calculate fare value (inverse of price - lower is better)
                            fare_value = 50  # Default
                            if rec.get("fare") and rec["fare"].get("price"):
                                # Lower price is better score
                                fare_price = float(rec["fare"]["price"])
                                fare_value = max(
                                    10, min(100, 100 - (fare_price / 50))
                                )

                            # Add trace
                            fig.add_trace(
                                go.Scatterpolar(
                                    r=[
                                        exchange_rate_norm,
                                        trend_norm,
                                        route_quality,
                                        fare_value,
                                        rec["score"],
                                    ],
                                    theta=categories,
                                    fill="toself",
                                    name=f"{rec['arrival_airport']} - {rec['city']}",
                                )
                            )

                        fig.update_layout(
                            polar=dict(
                                radialaxis=dict(visible=True, range=[0, 100])
                            ),
                            title="Destination Comparison (Higher is Better)",
                            template="plotly_white",
                        )

                        st.plotly_chart(fig, use_container_width=True)

                        # Fare comparison if available
                        fare_data = []
                        for rec in recommendations:
                            if rec.get("fare") and rec["fare"].get("price"):
                                fare_data.append(
                                    {
                                        "Destination": f"{rec['arrival_airport']} - {rec['city']}",
                                        "Price": float(rec["fare"]["price"]),
                                        "Currency": rec["fare"]["currency"],
                                        "Airlines": ", ".join(
                                            rec["fare"]["airlines"]
                                        )
                                        if rec["fare"].get("airlines")
                                        else "Unknown",
                                    }
                                )

                        if fare_data:
                            st.subheader("Fare Comparison")
                            fare_df = pd.DataFrame(fare_data)

                            fig = px.bar(
                                fare_df,
                                x="Destination",
                                y="Price",
                                color="Airlines",
                                title=f"Flight Fares (in {fare_df['Currency'].iloc[0]})",
                                template="plotly_white",
                                labels={
                                    "Price": f"Price ({fare_df['Currency'].iloc[0]})"
                                },
                                hover_data=["Airlines"],
                            )
                            st.plotly_chart(fig, use_container_width=True)
            else:
                st.warning(
                    "No recommendations found. Try a different airport."
                )

# Default instructions (shown on initial load)
else:
    st.markdown("""
    # Welcome to ChasquiFX Explorer! ✈️ 💱
    
    Find destinations with favorable exchange rates for your next trip!
    
    ## How it works
    
    ChasquiFX analyzes both **foreign exchange rates** and **available flight routes** 
    to recommend destinations where your money will go further.
    
    ### API Status
    """)

    # Display favorites if any
    if st.session_state.favorites:
        st.sidebar.subheader("Your Favorite Destinations")
        for fav in st.session_state.favorites:
            fav_col1, fav_col2 = st.sidebar.columns([4, 1])
            fav_col1.text(fav)
            if fav_col2.button("❌", key=f"remove_{fav}"):
                remove_favorite(fav)
                st.rerun()

    # API status check with animated display
    if st.session_state.api_status:
        st.success("✅ API server is running")
    else:
        st.error("❌ API server is not running")
        with st.expander("How to start the API server"):
            st.code(
                "cd /home/luisvinatea/DEVinatea/Repos/ChasquiFX\npython backend/api/main.py",
                language="bash",
            )
            st.warning(
                "Keep the API server terminal window open while using this app."
            )

    st.markdown("""
    ## Getting Started
    
    1. Select your **departure airport** in the sidebar
    2. Set your **travel dates** and preferences
    3. Click **"Find Destinations"** to see recommendations
    
    ## Features
    
    * **Exchange Rate Analysis**: Find destinations with favorable exchange rates
    * **Flight Route Information**: See direct and connecting flight options
    * **Fare Estimation**: Compare ticket prices across destinations
    * **Interactive Visualization**: Compare destinations on multiple factors
    
    ## How Scores are Calculated
    
    Each destination receives a score (0-100) based on:
    
    * **Exchange rate** - Higher rate means better value (30%)
    * **Currency trend** - Improving trends score higher (30%)
    * **Route quality** - Direct flights score higher (20%)
    * **Fare price** - Lower prices score higher (20%)
    """)

    # Display sample recommendations
    with st.expander("Sample Results Preview"):
        st.image(
            "https://media.giphy.com/media/ULUQvQ0LeGDQQmRSRT/giphy.gif",
            width=600,
        )
        st.caption("This is what your results will look like after searching.")

# Footer
st.sidebar.markdown("---")
with st.sidebar.expander("About ChasquiFX"):
    st.markdown("""
    **ChasquiFX** combines real-time forex data with flight route information to recommend 
    destinations with favorable exchange rates.
    
    The name "Chasqui" refers to the messengers of the Inca Empire, who carried information 
    across vast distances - much like our app connects you to global destinations!
    
    * **API Endpoint**: http://localhost:8000
    * **Documentation**: [API Docs](http://localhost:8000/docs)
    """)

st.sidebar.caption("© 2025 ChasquiFX")
st.sidebar.caption("Built with Streamlit and FastAPI")
