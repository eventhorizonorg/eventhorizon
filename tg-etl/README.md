# Telegram ETL Pipeline

A comprehensive ETL (Extract, Transform, Load) pipeline for extracting Telegram messages from public channels, geolocating them, and converting to GeoJSON format for visualization.

## 🏗️ Architecture

```
tg-etl/
├── extract/                 # Telegram extraction module
│   ├── telegram_parser.py   # Main extraction library
│   ├── config.ini.template  # Template for API credentials
│   ├── example_usage.py     # Usage examples
│   └── README.md           # Extraction documentation
├── data/                    # Data storage (gitignored)
│   ├── unprocessed/        # Raw extracted JSONL files
│   ├── processed/          # Enhanced JSONL with geolocation
│   ├── geojson/           # Final GeoJSON output
│   └── backup/            # Backup files
├── transform.py            # Main transformation script
├── jsonl_to_geojson.py    # JSONL to GeoJSON converter
├── extract_tg.sh          # Batch extraction script
├── countries.yml          # Country mappings
├── requirements.txt       # Python dependencies
└── README.md             # This file
```

## 🚀 Quick Start

### 1. Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Copy and configure credentials
cp extract/config.ini.template extract/config.ini
# Edit extract/config.ini with your Telegram API credentials
```

### 2. Extract Data

```bash
# Extract from all configured channels
./extract_tg.sh

# Or extract from specific channels
cd extract
python -c "
import asyncio
from telegram_parser import extract_channel
asyncio.run(extract_channel('militarysummary', limit=100))
"
```

### 3. Transform Data

```bash
# Set your Mapbox token (or use .env file)
export MAPBOX_ACCESS_TOKEN="your_mapbox_token_here"

# Transform to GeoJSON
python transform.py
python jsonl_to_geojson.py
```

### 4. Use in Web App

Copy `data/geojson/combined_telegram_data.geojson` to your web app and load it in Mapbox.

## 📋 Supported Channels

- **militarysummary** - Military Summary (Ukraine focus)
- **ClashReport** - Clash Report (Ukraine focus)
- **WarMonitors** - War Monitor (Ukraine focus)
- **DeepStateUA** - Deep State UA (Ukraine focus)
- **rybar_in_english** - Rybar in English (Russia focus)
- **geopolitics_prime** - Geopolitics Prime (Ukraine focus)
- **Middle_East_Spectator** - Middle East Spectator (Israel focus)
- **OSINT_Flow** - OSINT Flow (Ukraine focus)

## 🔧 Configuration

### Telegram API Setup

1. Go to https://my.telegram.org/apps
2. Create a new application
3. Get your `api_id` and `api_hash`
4. Add them to `extract/config.ini`

### Mapbox Setup

1. Get a Mapbox access token from https://account.mapbox.com/
2. Set it as environment variable: `export MAPBOX_ACCESS_TOKEN="your_token"`
3. Or add it to a `.env` file

## 📊 Data Flow

1. **Extract**: Raw Telegram messages → JSONL files
2. **Transform**: JSONL + geolocation → Enhanced JSONL
3. **Convert**: Enhanced JSONL → GeoJSON for visualization

## 🗺️ Geolocation Methods

The pipeline uses multiple geolocation strategies:

1. **Exact Coordinates** (95% confidence) - Direct lat/lon in text
2. **Flag Emojis** (85% confidence) - Country flags → country centroids
3. **LLM Geocoding** (70% confidence) - Place names → coordinates
4. **Place Name Geocoding** (40% confidence) - Simple place extraction
5. **Channel Fallback** (20% confidence) - Channel context → country centroids

## 📁 Output Formats

### JSONL Format (Intermediate)
```json
{
  "id": 12345,
  "date": "2025-06-28T18:45:15+00:00",
  "text": "Message content...",
  "telegram_url": "https://t.me/militarysummary/12345",
  "geolocation": {
    "lat": 50.4501,
    "lon": 30.5234,
    "confidence": 0.95,
    "source": "coordinates_regex",
    "place_name": "Kyiv, Ukraine"
  }
}
```

### GeoJSON Format (Final)
```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [30.5234, 50.4501]
  },
  "properties": {
    "id": 12345,
    "text": "Message content...",
    "telegram_url": "https://t.me/militarysummary/12345",
    "confidence": 0.95
  }
}
```

## 🔒 Security

The following files are automatically excluded from git:
- `*.session` - Telegram session files
- `extract/config.ini` - API credentials
- `.env` - Environment variables
- `data/` - All extracted data
- `__pycache__/` - Python cache files

## 📈 Performance

Typical geolocation success rates:
- **High confidence channels**: 80-90% (militarysummary, geopolitics_prime)
- **Medium confidence channels**: 60-80% (ClashReport, WarMonitors)
- **Lower confidence channels**: 40-60% (rybar_in_english, Middle_East_Spectator)

## 🛠️ Development

### Adding New Channels

1. Add channel to `extract_tg.sh`
2. Add channel mapping in `transform.py` (if needed)
3. Update this README

### Customizing Geolocation

Modify the geolocation logic in `transform.py`:
- Add new coordinate patterns
- Enhance place name extraction
- Adjust confidence scoring

## 📝 License

This project is part of the OpenConflict initiative and follows the same license terms.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:
1. Check the documentation in each subdirectory
2. Review the example scripts
3. Check the logs for error messages
4. Open an issue on GitHub 