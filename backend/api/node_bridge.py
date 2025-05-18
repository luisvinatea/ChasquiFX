"""
Node.js bridge for ChasquiFX API

This module provides a compatibility layer for running the ChasquiFX
API with Node.js, enabling direct communication between the Node.js API layer
and Python data processing.

NOTE: This bridge is the recommended way to access Python functionality
from the Node.js backend. Direct use of the Python API endpoints is deprecated.
"""

import os
import sys
import importlib
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Body
from fastapi.responses import JSONResponse

# Ensure the package structure is properly imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.api.utils.logging_utils import get_api_logger  # noqa: E402
from backend.api.adapters import node_adapter  # noqa: E402

# Set up logging
logger = get_api_logger()

# Create router for Node.js bridge endpoints
node_bridge_router = APIRouter(prefix="/node_bridge", tags=["Node.js Bridge"])


@node_bridge_router.post("/call_adapter")
async def call_adapter(
    module_name: str = Body(...),
    function_name: str = Body(...),
    args: List[Any] = Body(default=[]),
    kwargs: Dict[str, Any] = Body(default={}),
):
    """
    Call a Python function from Node.js

    Args:
        module_name: Name of the module to import (should be in the adapters
        package)
        function_name: Name of the function to call
        args: Positional arguments to pass to the function
        kwargs: Keyword arguments to pass to the function
    """
    try:
        logger.info(f"Node.js bridge: Calling {module_name}.{function_name}")

        # Dynamically import the module
        try:
            module = importlib.import_module(
                f"backend.api.adapters.{module_name}"
            )
            function = getattr(module, function_name)
        except (ImportError, AttributeError) as e:
            logger.error(
                f"Failed to import {module_name}.{function_name}: {e}"
            )
            error_msg = f"Function {module_name}.{function_name} not found"
            return JSONResponse(
                status_code=404,
                content={"error": error_msg},
            )

        # Call the function
        result = function(*args, **kwargs)
        return JSONResponse(status_code=200, content=result)

    except Exception as e:
        logger.error(f"Error in call_adapter: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "type": type(e).__name__},
        )


@node_bridge_router.post("/forex/rates")
async def get_forex_rates(
    from_currency: str = Body(...),
    to_currency: str = Body(...),
    api_key: Optional[str] = Body(None),
):
    """
    Get forex exchange rates

    Args:
        from_currency: Base currency code
        to_currency: Target currency code
        api_key: Optional API key
    """
    try:
        result = node_adapter.get_exchange_rates(
            from_currency, to_currency, api_key
        )
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Error in get_forex_rates: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "type": type(e).__name__},
        )


@node_bridge_router.post("/recommendations")
async def get_recommendations(
    base_currency: str = Body(...),
    departure_airport: str = Body(...),
    outbound_date: Optional[str] = Body(None),
    return_date: Optional[str] = Body(None),
    api_key: Optional[str] = Body(None),
):
    """
    Get travel recommendations

    Args:
        base_currency: Base currency code
        departure_airport: Departure airport code
        outbound_date: Optional outbound date
        return_date: Optional return date
        api_key: Optional API key
    """
    try:
        result = node_adapter.get_recommendations(
            base_currency,
            departure_airport,
            outbound_date,
            return_date,
            api_key,
        )
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Error in get_recommendations: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "type": type(e).__name__},
        )


@node_bridge_router.post("/data/parquet")
async def retrieve_parquet_data(
    file_key: str = Body(...), filters: Optional[Dict[str, Any]] = Body(None)
):
    """
    Retrieve data from Parquet file

    Args:
        file_key: The key of the Parquet file
        filters: Optional filters to apply
    """
    try:
        result = node_adapter.retrieve_parquet_data(file_key, filters)
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(
            f"Error in retrieve_parquet_data: {str(e)}", exc_info=True
        )
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "type": type(e).__name__},
        )
