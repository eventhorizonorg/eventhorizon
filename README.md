# Live Earthquakes Globe

An interactive 3D globe visualization showing real-time earthquake data from the USGS Earthquake Hazards Program. Displays all earthquakes with magnitude ≥ 2.5 from the last 24 hours, updated every minute.

## Features

- **3D Globe View**: Interactive globe projection with 45° pitch (falls back to flat Mercator on mobile)
- **Real-time Data**: USGS earthquake feed updated every minute
- **Visual Encoding**: 
  - Circle size represents earthquake magnitude (M 0-8)
  - Circle color represents depth (0-700km, shallow to deep)
- **Interactive**: Click earthquakes for detailed popup with USGS link
- **Performance Optimized**: Limited to 1,500 most recent earthquakes
- **Responsive**: Works on desktop and mobile devices

## Data Source

This application uses the USGS Earthquake Hazards Program GeoJSON feed:
- **URL**: https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson
- **Update Frequency**: Every minute
- **License**: Public Domain (USGS)

## Setup Instructions

### Local Development

1. Clone or download this repository
2. Serve the files using any static web server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve . -l 8000

# Using PHP
php -S localhost:8000
```

3. Open http://localhost:8000 in your browser

### Deployment

#### GitHub Pages

1. Push code to a GitHub repository
2. Go to Settings → Pages
3. Select source branch (usually `main`)
4. Your app will be available at `https://username.github.io/repository-name`

#### Netlify

1. Drag and drop the project folder to [Netlify Drop](https://app.netlify.com/drop)
2. Or connect your GitHub repository for automatic deployments

## Technical Details

### Dependencies

- **MapLibre GL JS** (v3.6.2): Open-source mapping library
- **USGS GeoJSON API**: Real-time earthquake data

### Browser Support

- Modern browsers with WebGL support
- Globe projection requires WebGL2 (falls back to Mercator on older devices)
- Mobile-responsive design

### Performance

- Optimized for Lighthouse performance score ≥ 90
- Limited to 1,500 earthquake features maximum
- Efficient data updates using `setData()` method
- Retry logic with exponential backoff for API failures

### File Structure

```
├── index.html          # Main HTML file
├── main.js            # Application logic
├── styles.css         # Styling and responsive design
└── README.md          # This file
```

## License

This project is in the public domain. Earthquake data provided by the USGS Earthquake Hazards Program.

## Attribution

- Earthquake data: [USGS Earthquake Hazards Program](https://earthquake.usgs.gov/)
- Base map: [MapLibre Demo Tiles](https://demotiles.maplibre.org/)
- Built with [MapLibre GL JS](https://maplibre.org/)