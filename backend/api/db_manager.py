#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Database manager for ChasquiFX
This module handles persistent storage for user favorites and preferences
"""

import os
import sqlite3
import json
from datetime import datetime
import pandas as pd


class DatabaseManager:
    """Database manager for ChasquiFX to handle persistent storage"""

    def __init__(self, db_path=None):
        """Initialize the database connection

        Args:
            db_path (str, optional): Path to the SQLite database. Defaults to None.
                If None, a default path in the user's home directory is used.
        """
        if db_path is None:
            # Use a default location in the user's home directory
            home_dir = os.path.expanduser("~")
            data_dir = os.path.join(home_dir, ".ChasquiFX")
            os.makedirs(data_dir, exist_ok=True)
            db_path = os.path.join(data_dir, "ChasquiFX.db")

        self.db_path = db_path
        self._initialize_db()

    def _initialize_db(self):
        """Create tables if they don't exist"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Create favorites table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            destination TEXT NOT NULL,
            source_currency TEXT NOT NULL,
            target_currency TEXT NOT NULL,
            exchange_rate REAL NOT NULL,
            date_added TEXT NOT NULL,
            notes TEXT,
            metadata TEXT
        )
        """)

        # Create preferences table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS preferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            value TEXT NOT NULL,
            last_updated TEXT NOT NULL
        )
        """)

        # Create search history table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS search_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            search_params TEXT NOT NULL,
            result_count INTEGER NOT NULL,
            timestamp TEXT NOT NULL
        )
        """)

        conn.commit()
        conn.close()

    def add_favorite(
        self,
        destination,
        source_currency,
        target_currency,
        exchange_rate,
        notes=None,
        metadata=None,
    ):
        """Add a destination to favorites

        Args:
            destination (str): The destination name
            source_currency (str): Source currency code (e.g., USD)
            target_currency (str): Target currency code (e.g., EUR)
            exchange_rate (float): Current exchange rate
            notes (str, optional): User notes. Defaults to None.
            metadata (dict, optional): Additional metadata. Defaults to None.

        Returns:
            int: ID of the new favorite entry
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        date_added = datetime.now().isoformat()
        metadata_json = json.dumps(metadata) if metadata else None

        cursor.execute(
            """
        INSERT INTO favorites (destination, source_currency, target_currency, 
                              exchange_rate, date_added, notes, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
            (
                destination,
                source_currency,
                target_currency,
                exchange_rate,
                date_added,
                notes,
                metadata_json,
            ),
        )

        last_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return last_id

    def remove_favorite(self, favorite_id):
        """Remove a destination from favorites

        Args:
            favorite_id (int): The ID of the favorite entry to remove

        Returns:
            bool: True if successfully removed, False otherwise
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("DELETE FROM favorites WHERE id=?", (favorite_id,))
        success = cursor.rowcount > 0

        conn.commit()
        conn.close()

        return success

    def get_all_favorites(self):
        """Get all favorite destinations

        Returns:
            pandas.DataFrame: DataFrame containing all favorite destinations
        """
        conn = sqlite3.connect(self.db_path)

        query = """
        SELECT id, destination, source_currency, target_currency, 
               exchange_rate, date_added, notes 
        FROM favorites
        ORDER BY date_added DESC
        """

        df = pd.read_sql_query(query, conn)
        conn.close()

        return df

    def save_preference(self, name, value):
        """Save a user preference

        Args:
            name (str): The preference name
            value (any): The preference value (will be JSON serialized)

        Returns:
            bool: True if successful, False otherwise
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        value_json = json.dumps(value)
        last_updated = datetime.now().isoformat()

        cursor.execute(
            """
        INSERT OR REPLACE INTO preferences (name, value, last_updated)
        VALUES (?, ?, ?)
        """,
            (name, value_json, last_updated),
        )

        success = cursor.rowcount > 0
        conn.commit()
        conn.close()

        return success

    def get_preference(self, name, default=None):
        """Get a user preference

        Args:
            name (str): The preference name
            default (any, optional): Default value if preference doesn't exist

        Returns:
            any: The preference value
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT value FROM preferences WHERE name=?", (name,))
        result = cursor.fetchone()

        conn.close()

        if result:
            return json.loads(result[0])
        return default

    def log_search(self, search_params, result_count):
        """Log a search query

        Args:
            search_params (dict): The search parameters
            result_count (int): Number of results found

        Returns:
            int: ID of the search history entry
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        params_json = json.dumps(search_params)
        timestamp = datetime.now().isoformat()

        cursor.execute(
            """
        INSERT INTO search_history (search_params, result_count, timestamp)
        VALUES (?, ?, ?)
        """,
            (params_json, result_count, timestamp),
        )

        last_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return last_id

    def get_recent_searches(self, limit=10):
        """Get recent searches

        Args:
            limit (int, optional): Number of records to return. Defaults to 10.

        Returns:
            pandas.DataFrame: DataFrame containing recent searches
        """
        conn = sqlite3.connect(self.db_path)

        query = """
        SELECT id, search_params, result_count, timestamp
        FROM search_history
        ORDER BY timestamp DESC
        LIMIT ?
        """

        df = pd.read_sql_query(query, conn, params=(limit,))
        conn.close()

        # Parse the JSON in search_params
        if not df.empty:
            df["search_params"] = df["search_params"].apply(json.loads)

        return df

    def backup_database(self, backup_path=None):
        """Create a backup of the database

        Args:
            backup_path (str, optional): Path where to save the backup.
                If None, a default name with timestamp is used.

        Returns:
            str: Path to the backup file
        """
        if backup_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_dir = os.path.join(
                os.path.expanduser("~"), ".ChasquiFX", "backups"
            )
            os.makedirs(backup_dir, exist_ok=True)
            backup_path = os.path.join(
                backup_dir, f"ChasquiFX_backup_{timestamp}.db"
            )

        # Create a connection to the backup database
        source = sqlite3.connect(self.db_path)
        destination = sqlite3.connect(backup_path)

        # Copy database contents
        source.backup(destination)

        source.close()
        destination.close()

        return backup_path
