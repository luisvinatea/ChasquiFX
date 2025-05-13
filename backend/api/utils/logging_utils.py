"""
Logging utility functions for ChasquiFX.
"""

import logging
import os
from logging.handlers import RotatingFileHandler

from backend.api.config import LOGS_DIR


def setup_logger(name: str, log_file: str = None, level=logging.INFO):
    """
    Set up a logger with appropriate handlers and formatting.

    Args:
        name: Name of the logger
        log_file: Path to the log file
        level: Logging level

    Returns:
        Configured logger
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)

    # Create formatter
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    # Create console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # Create file handler if log_file is provided
    if log_file:
        os.makedirs(os.path.dirname(log_file), exist_ok=True)
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=10 * 1024 * 1024,  # 10 MB
            backupCount=5,
        )
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    return logger


def get_api_logger():
    """
    Get the API logger with appropriate configuration.

    Returns:
        Configured API logger
    """
    return setup_logger(
        name="chasquifx_api",
        log_file=os.path.join(LOGS_DIR, "api_server.log"),
    )
