"""
Example of a fixed node_adapter.py function.
This demonstrates the proper way to implement adapter functions.
"""

def get_exchange_rates(from_currency: str, to_currency: str, api_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Get exchange rates using Python forex_service.

    Args:
        from_currency: Base currency code
        to_currency: Target currency code
        api_key: Optional API key

    Returns:
        Dict containing exchange rate data
    """
    try:
        logger.info(
            f"Python adapter: Getting exchange rates "
            f"{from_currency} to {to_currency}"
        )
        # Use the correct function name from forex_service
        # If get_exchange_rates doesn't exist, use an alternative like get_exchange_rate
        if hasattr(forex_service, 'get_exchange_rates'):
            result = forex_service.get_exchange_rates(from_currency, to_currency, api_key)
        elif hasattr(forex_service, 'get_exchange_rate'):
            # Adapt parameters if needed
            result = {'rate': forex_service.get_exchange_rate(from_currency, to_currency, api_key)}
        else:
            raise AttributeError("No suitable exchange rate function found in forex_service")
        
        # Ensure the result is properly formatted
        if not isinstance(result, dict):
            result = {'rate': result, 'timestamp': datetime.now().isoformat()}
            
        return result
    except Exception as e:
        logger.error(f"Error in get_exchange_rates: {str(e)}")
        return {"error": str(e), "type": type(e).__name__}
