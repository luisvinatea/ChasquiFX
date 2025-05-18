-- Migration file to add parquet_storage table
-- Run this in the Supabase SQL editor to update your schema

-- Create table for Parquet file storage
CREATE TABLE IF NOT EXISTS parquet_storage (
    id BIGSERIAL PRIMARY KEY,
    file_key TEXT NOT NULL UNIQUE,
    file_path TEXT NOT NULL,
    original_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    etag TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Additional metadata as JSONB
    metadata JSONB DEFAULT '{}'::JSONB
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_parquet_storage_file_key ON parquet_storage(file_key);
CREATE INDEX IF NOT EXISTS idx_parquet_storage_is_active ON parquet_storage(is_active);

-- Enable Row Level Security
ALTER TABLE parquet_storage ENABLE ROW LEVEL SECURITY;

-- Create policy for only admins and service role
CREATE POLICY "Service role can manage parquet_storage" ON parquet_storage
  USING (true)
  WITH CHECK (true);

-- Grant permissions to authenticated users to select only
GRANT SELECT ON TABLE parquet_storage TO authenticated;
-- Allow anon to select for public data
GRANT SELECT ON TABLE parquet_storage TO anon;
-- Service role can do everything
GRANT ALL ON TABLE parquet_storage TO service_role;
