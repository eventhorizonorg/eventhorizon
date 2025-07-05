# OpenConflict - Interactive Conflict Event Visualization

A clean, interactive web-based visualization for conflict events using Mapbox GL JS. This project provides a simple, elegant way to display geolocated events on a map with smooth animations and interactive features.

## Features

- **Interactive Map**: Built with Mapbox GL JS for smooth, responsive mapping
- **Animated Event Points**: Pulsating dots with randomized phase offsets for organic animation
- **Country Highlighting**: Automatic country detection and highlighting on hover/click
- **Interactive Popups**: Rich popup information with hover and click interactions
- **ElevenLabs Integration**: AI-powered conversational interface for map navigation
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Theme**: Modern, professional dark interface

## Project Structure

```
openconflict/
├── index.html          # Main HTML file
├── script.js           # Main JavaScript application
├── styles.css          # CSS styling
├── sample_data.geojson # Sample event data
└── README.md           # This file
```

## Quick Start

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd openconflict
   ```

2. **Set up Mapbox Token**:
   - Get a free Mapbox access token from [mapbox.com](https://www.mapbox.com/)
   - Add your token to the `MAPBOX_TOKEN` variable in `script.js`

3. **Start the server**:
   ```bash
   python -m http.server 8001
   ```

4. **Open in browser**:
   Navigate to `http://localhost:8001`

## Data Format

The application expects GeoJSON data with the following structure:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [longitude, latitude]
      },
      "properties": {
        "id": "unique_id",
        "date": "2024-06-30T10:30:00Z",
        "text": "Event description",
        "telegram_url": "https://t.me/channel/123",
        "source_username": "channel_name",
        "geolocation": {
          "confidence": 0.85,
          "source": "data_source",
          "place_name": "City, Country"
        }
      }
    }
  ]
}
```

## Customization

### Animation Speed
Adjust the pulse frequency in `script.js`:
```javascript
const freq = 0.25; // Change this value (0.1 = very slow, 1.0 = fast)
```

### Point Styling
Modify the circle appearance in the `map.addLayer` call:
```javascript
'circle-color': '#fff',        // Point color
'circle-opacity': 0.85,        // Transparency
'circle-radius': ['get', 'pulse_radius']  // Size
```

### Map Style
Change the map style in the Mapbox initialization:
```javascript
style: 'mapbox://styles/mapbox/dark-v11'  // Try 'satellite-v9' or 'streets-v12'
```

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Dependencies

- Mapbox GL JS (loaded via CDN)
- ElevenLabs ConvAI Widget (optional, for AI navigation)

## License

This project is open source and available under the MIT License.

## Contributing

Feel free to submit issues and enhancement requests!

# Telegram Conflict Events Map

An interactive Mapbox visualization displaying Telegram events with animated, pulsating dots. The map shows conflict-related events with popup details and country highlighting.

## Features

- **Interactive Map**: Built with Mapbox GL JS
- **Animated Dots**: Pulsating effect with randomized phases
- **Country Highlighting**: Hover over dots to highlight country borders
- **Detailed Popups**: Show event details with text and metadata
- **Supabase Integration**: Fetch data from your Supabase database
- **Fallback Data**: Uses sample data if Supabase is not configured

## Setup

### 1. Prerequisites

- A Mapbox access token
- A Supabase project (optional - will fallback to sample data)

### 2. Mapbox Setup

1. Get your Mapbox access token from [Mapbox](https://account.mapbox.com/)
2. Update the `MAPBOX_TOKEN` in `index.html`

### 3. Supabase Setup (Optional)

If you want to use your own data:

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Create a table called `telegram_events` with the following schema:

```sql
CREATE TABLE telegram_events (
  id SERIAL PRIMARY KEY,
  text TEXT,
  channel VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  media_url TEXT,
  telegram_url TEXT
);
```

3. Update `supabase-config.js` with your credentials:
   - Replace `YOUR_SUPABASE_URL` with your project URL
   - Replace `YOUR_SUPABASE_ANON_KEY` with your public anon key

### 4. Running the Project

1. Start a local HTTP server:
   ```bash
   python -m http.server 8000
   # or
   npx serve .
   ```

2. Open `http://localhost:8000` in your browser

## Data Sources

- **Primary**: Supabase database (if configured)
- **Fallback**: `sample_data.geojson` (local sample data)

The application will automatically use Supabase data if available, otherwise it will fall back to the sample data.

## Customization

### Table Schema

If your Supabase table has different column names, update the mapping in `script.js`:

```javascript
// In loadTelegramGeoJSON function, adjust these field mappings:
coordinates: [record.longitude, record.latitude],
text: record.text || record.message || '',
channel: record.channel || record.channel_name || '',
```

### Animation Settings

Adjust the pulsation speed in `script.js`:

```javascript
const freq = 0.25; // Change this value to adjust pulse frequency
```

## Project Structure

```
├── index.html              # Main HTML file
├── script.js               # Main JavaScript logic
├── styles.css              # CSS styles
├── supabase-config.js      # Supabase configuration
├── sample_data.geojson     # Fallback sample data
└── README.md              # This file
```

## Troubleshooting

- **No data showing**: Check browser console for errors. Ensure Supabase credentials are correct or that `sample_data.geojson` exists.
- **Map not loading**: Verify your Mapbox token is valid.
- **Supabase connection issues**: Check your network connection and Supabase project status.