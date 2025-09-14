-- Supabase Database Schema for Traffic Data Storage
-- Run this in your Supabase SQL editor

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create traffic_patterns table
CREATE TABLE IF NOT EXISTS traffic_patterns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    location_key TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    severity TEXT CHECK (severity IN ('low', 'moderate', 'high', 'severe')) NOT NULL,
    congestion_level INTEGER CHECK (congestion_level >= 0 AND congestion_level <= 100) NOT NULL,
    average_speed DECIMAL(8, 2) NOT NULL,
    confidence DECIMAL(3, 2) CHECK (confidence >= 0 AND confidence <= 1) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6) NOT NULL,
    hour_of_day INTEGER CHECK (hour_of_day >= 0 AND hour_of_day <= 23) NOT NULL,
    month INTEGER CHECK (month >= 1 AND month <= 12) NOT NULL,
    season TEXT CHECK (season IN ('spring', 'summer', 'fall', 'winter')) NOT NULL,
    weather_conditions TEXT,
    is_holiday BOOLEAN DEFAULT FALSE,
    is_weekend BOOLEAN DEFAULT FALSE,
    is_rush_hour BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create traffic_hotspots table
CREATE TABLE IF NOT EXISTS traffic_hotspots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    location_key TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    severity TEXT CHECK (severity IN ('low', 'moderate', 'high', 'severe')) NOT NULL,
    frequency DECIMAL(3, 2) CHECK (frequency >= 0 AND frequency <= 1) NOT NULL,
    average_congestion DECIMAL(5, 2) NOT NULL,
    peak_hours INTEGER[] DEFAULT '{}',
    peak_days INTEGER[] DEFAULT '{}',
    seasonal_patterns JSONB DEFAULT '{}',
    data_points INTEGER DEFAULT 1,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create alternative_routes table
CREATE TABLE IF NOT EXISTS alternative_routes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    route_key TEXT NOT NULL,
    origin_lat DECIMAL(10, 8) NOT NULL,
    origin_lng DECIMAL(11, 8) NOT NULL,
    destination_lat DECIMAL(10, 8) NOT NULL,
    destination_lng DECIMAL(11, 8) NOT NULL,
    route_name TEXT NOT NULL,
    distance INTEGER NOT NULL, -- in meters
    estimated_duration INTEGER NOT NULL, -- in seconds
    average_speed DECIMAL(8, 2) NOT NULL,
    congestion_level INTEGER CHECK (congestion_level >= 0 AND congestion_level <= 100) NOT NULL,
    confidence DECIMAL(3, 2) CHECK (confidence >= 0 AND confidence <= 1) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    route_type TEXT CHECK (route_type IN ('highway', 'arterial', 'local', 'mixed')) NOT NULL,
    toll_required BOOLEAN DEFAULT FALSE,
    road_conditions TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create stored_traffic_data table
CREATE TABLE IF NOT EXISTS stored_traffic_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    collection_data JSONB NOT NULL,
    analysis_data JSONB NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_traffic_patterns_user_id ON traffic_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_traffic_patterns_location ON traffic_patterns(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_traffic_patterns_timestamp ON traffic_patterns(timestamp);
CREATE INDEX IF NOT EXISTS idx_traffic_patterns_day_hour ON traffic_patterns(day_of_week, hour_of_day);

CREATE INDEX IF NOT EXISTS idx_hotspots_user_id ON traffic_hotspots(user_id);
CREATE INDEX IF NOT EXISTS idx_hotspots_location ON traffic_hotspots(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_hotspots_severity ON traffic_hotspots(severity);

CREATE INDEX IF NOT EXISTS idx_routes_user_id ON alternative_routes(user_id);
CREATE INDEX IF NOT EXISTS idx_routes_key ON alternative_routes(route_key);
CREATE INDEX IF NOT EXISTS idx_routes_timestamp ON alternative_routes(timestamp);

CREATE INDEX IF NOT EXISTS idx_stored_data_user_id ON stored_traffic_data(user_id);
CREATE INDEX IF NOT EXISTS idx_stored_data_timestamp ON stored_traffic_data(timestamp);

-- Enable Row Level Security
ALTER TABLE traffic_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_hotspots ENABLE ROW LEVEL SECURITY;
ALTER TABLE alternative_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stored_traffic_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own traffic patterns" ON traffic_patterns
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own traffic patterns" ON traffic_patterns
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own traffic patterns" ON traffic_patterns
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own traffic patterns" ON traffic_patterns
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own hotspots" ON traffic_hotspots
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own hotspots" ON traffic_hotspots
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own hotspots" ON traffic_hotspots
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own hotspots" ON traffic_hotspots
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own routes" ON alternative_routes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own routes" ON alternative_routes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own routes" ON alternative_routes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own routes" ON alternative_routes
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own stored data" ON stored_traffic_data
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stored data" ON stored_traffic_data
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stored data" ON stored_traffic_data
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stored data" ON stored_traffic_data
    FOR DELETE USING (auth.uid() = user_id);

-- Create functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_traffic_patterns_updated_at BEFORE UPDATE ON traffic_patterns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hotspots_updated_at BEFORE UPDATE ON traffic_hotspots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON alternative_routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stored_data_updated_at BEFORE UPDATE ON stored_traffic_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a function to get traffic analytics
CREATE OR REPLACE FUNCTION get_traffic_analytics(
    p_user_id UUID,
    p_latitude DECIMAL DEFAULT NULL,
    p_longitude DECIMAL DEFAULT NULL,
    p_radius_km DECIMAL DEFAULT 10
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    WITH location_filter AS (
        SELECT *
        FROM traffic_patterns tp
        WHERE tp.user_id = p_user_id
        AND (p_latitude IS NULL OR p_longitude IS NULL OR 
             ST_DWithin(
                 ST_Point(tp.longitude, tp.latitude)::geography,
                 ST_Point(p_longitude, p_latitude)::geography,
                 p_radius_km * 1000
             ))
    ),
    analytics AS (
        SELECT 
            COUNT(*) as total_data_points,
            AVG(congestion_level) as average_congestion,
            jsonb_agg(
                jsonb_build_object(
                    'hour', hour_of_day,
                    'congestion', AVG(congestion_level)
                ) ORDER BY AVG(congestion_level) DESC
            ) FILTER (WHERE hour_of_day IS NOT NULL) as peak_traffic_hours,
            jsonb_agg(
                jsonb_build_object(
                    'day', CASE day_of_week 
                        WHEN 0 THEN 'Sunday'
                        WHEN 1 THEN 'Monday'
                        WHEN 2 THEN 'Tuesday'
                        WHEN 3 THEN 'Wednesday'
                        WHEN 4 THEN 'Thursday'
                        WHEN 5 THEN 'Friday'
                        WHEN 6 THEN 'Saturday'
                    END,
                    'congestion', AVG(congestion_level)
                ) ORDER BY AVG(congestion_level) DESC
            ) FILTER (WHERE day_of_week IS NOT NULL) as peak_traffic_days
        FROM location_filter
    )
    SELECT jsonb_build_object(
        'totalDataPoints', total_data_points,
        'averageCongestion', COALESCE(average_congestion, 0),
        'peakTrafficHours', COALESCE(peak_traffic_hours, '[]'::jsonb),
        'peakTrafficDays', COALESCE(peak_traffic_days, '[]'::jsonb)
    ) INTO result
    FROM analytics;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_traffic_analytics(UUID, DECIMAL, DECIMAL, DECIMAL) TO authenticated;
