-- Supabase SQL schema for ChasquiFX
-- Run this in the Supabase SQL Editor to set up the database tables
-- Table for API usage logs
CREATE TABLE
    api_usage_logs (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID REFERENCES auth.users (id),
        endpoint TEXT NOT NULL,
        request_data JSONB NOT NULL DEFAULT '{}',
        response_status INTEGER NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW ()
    );

-- Create index for better query performance
CREATE INDEX api_usage_logs_user_id_idx ON api_usage_logs (user_id);

CREATE INDEX api_usage_logs_endpoint_idx ON api_usage_logs (endpoint);

-- Table for cached forex data
CREATE TABLE
    forex_cache (
        id BIGSERIAL PRIMARY KEY,
        currency_pair TEXT NOT NULL,
        data JSONB NOT NULL,
        last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        expiry TIMESTAMPTZ NOT NULL
    );

-- Create unique index for currency pair
CREATE UNIQUE INDEX forex_cache_currency_pair_idx ON forex_cache (currency_pair);

CREATE INDEX forex_cache_expiry_idx ON forex_cache (expiry);

-- Table for cached flight data
CREATE TABLE
    flight_cache (
        id BIGSERIAL PRIMARY KEY,
        origin TEXT NOT NULL,
        destination TEXT NOT NULL,
        data JSONB NOT NULL,
        last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW (),
        expiry TIMESTAMPTZ NOT NULL
    );

-- Create unique index for route
CREATE UNIQUE INDEX flight_cache_route_idx 
    ON flight_cache (origin, destination);

CREATE INDEX flight_cache_expiry_idx ON flight_cache (expiry);

-- Table for user API keys (encrypted)
CREATE TABLE
    user_api_keys (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users (id),
        serpapi_key TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW ()
    );

-- Create unique index for user_id
CREATE UNIQUE INDEX user_api_keys_user_id_idx ON user_api_keys (user_id);

-- Table for user recommendations
CREATE TABLE
    user_recommendations (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID REFERENCES auth.users (id),
        origin_currency TEXT NOT NULL,
        destination_currency TEXT NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        recommended_destination TEXT NOT NULL,
        exchange_rate DECIMAL(15, 6) NOT NULL,
        savings_percentage DECIMAL(5, 2) NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW ()
    );

-- Create index for better query performance
CREATE INDEX user_recommendations_user_id_idx 
    ON user_recommendations (user_id);

-- Row level security policies
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

ALTER TABLE user_recommendations ENABLE ROW LEVEL SECURITY;

-- Policies for api_usage_logs
CREATE POLICY "Users can view their own API usage logs" 
    ON api_usage_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "API service can insert logs" 
    ON api_usage_logs FOR INSERT
    WITH CHECK (true);

-- Policies for user_api_keys
CREATE POLICY "Users can view and update their own API keys" 
    ON user_api_keys FOR ALL 
    USING (auth.uid() = user_id);

-- Policies for user_recommendations
CREATE POLICY "Users can view their own recommendations" 
    ON user_recommendations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "API service can insert recommendations" 
    ON user_recommendations FOR INSERT
    WITH CHECK (true);

-- Allow public read access to cached data
ALTER TABLE forex_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read forex cache" 
    ON forex_cache FOR SELECT
    USING (true);

ALTER TABLE flight_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read flight cache" 
    ON flight_cache FOR SELECT
    USING (true);

-- Allow service role to manage cache
CREATE POLICY "Service role can manage forex cache" 
    ON forex_cache FOR ALL 
    USING (auth.jwt() -> 'role' = 'service_role');

CREATE POLICY "Service role can manage flight cache" 
    ON flight_cache FOR ALL 
    USING (auth.jwt() -> 'role' = 'service_role');