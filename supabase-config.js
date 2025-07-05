// Supabase Configuration Template
// Copy this file to supabase-config.js and fill in your actual credentials

// Replace these with your actual Supabase project credentials
const SUPABASE_CONFIG = {
  url: 'YOUR_SUPABASE_URL', // e.g., 'https://your-project.supabase.co'
  anonKey: 'YOUR_SUPABASE_ANON_KEY' // Your public anon key from Supabase dashboard
};

// Example table schema for reference:
/*
CREATE TABLE telegram_events (
  id SERIAL PRIMARY KEY,
  text TEXT,
  channel VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  media_url TEXT,
  telegram_url TEXT,
  -- Add any other columns you need
);
*/

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SUPABASE_CONFIG;
} 