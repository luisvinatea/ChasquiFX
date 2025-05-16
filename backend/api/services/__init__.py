"""
Package initialization for services module.
"""

from backend.api.services.forex_service import (  # noqa: F401
    load_forex_data,
    load_forex_mappings,
    load_currency_codes,
    get_exchange_rate,
)

from backend.api.services.geo_service import (  # noqa: F401
    load_airports_data,
    load_routes_data,
    load_airlines_data,
    get_airport_country_map,
    get_routes_for_airport,
)

from backend.api.services.flight_service import (  # noqa: F401
    fetch_flight_fare,
    fetch_multiple_fares,
)

from backend.api.services.recommendation_service import (  # noqa: F401
    calculate_trend,
    get_exchange_rate_with_trend,
    get_recommendations,
)
