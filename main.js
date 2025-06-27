// Live Earthquakes Globe
// Data source: USGS Earthquake Hazards Program
// License: Public Domain

// Set your Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoiZGFuaWVsc3VueXVhbiIsImEiOiJjbHBiM3FhOXUwYmxnMmtubzljcGRwcHBjIn0.MO5mlsRbbl-O6labngyIaA';

class EarthquakeGlobe {
    constructor() {
        this.map = null;
        this.earthquakeData = [];
        this.lastUpdateTime = null;
        this.refreshInterval = null;
        
        this.init();
    }

    init() {
        this.initMap();
        this.loadEarthquakeData();
        this.startAutoRefresh();
    }

    initMap() {
        // Check if device supports globe projection
        const supportsGlobe = this.checkGlobeSupport();
        
        this.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [0, 0], // Centered on equator and prime meridian
            zoom: 1.5, // Slightly zoomed out for better global view
            pitch: supportsGlobe ? 45 : 0,
            projection: supportsGlobe ? 'globe' : 'mercator'
        });

        this.map.on('load', () => {
            this.setupEarthquakeLayer();
        });

        // Handle click events for popups
        this.map.on('click', 'earthquakes', (e) => {
            this.showEarthquakePopup(e);
        });

        // Change cursor on hover
        this.map.on('mouseenter', 'earthquakes', () => {
            this.map.getCanvas().style.cursor = 'pointer';
        });

        this.map.on('mouseleave', 'earthquakes', () => {
            this.map.getCanvas().style.cursor = '';
        });
    }

    checkGlobeSupport() {
        // Simple check for WebGL2 support and mobile detection
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2');
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        return gl && !isMobile;
    }

    setupEarthquakeLayer() {
        // Add earthquake data source
        this.map.addSource('earthquakes', {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });

        // Add earthquake layer with styling
        this.map.addLayer({
            id: 'earthquakes',
            type: 'circle',
            source: 'earthquakes',
            paint: {
                'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['get', 'mag'],
                    0, 4,
                    8, 20
                ],
                'circle-color': [
                    'interpolate',
                    ['linear'],
                    ['get', 'depth'],
                    0, '#ffeda0',
                    70, '#feb24c',
                    300, '#fd8d3c',
                    700, '#f03b20'
                ],
                'circle-opacity': 0.7,
                'circle-stroke-width': 1,
                'circle-stroke-color': '#ffffff',
                'circle-stroke-opacity': 0.3
            }
        });
    }

    async loadEarthquakeData() {
        try {
            const cacheBuster = Date.now();
            const response = await fetch(`https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson?_=${cacheBuster}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.processEarthquakeData(data);
            this.updateUI();
            
        } catch (error) {
            console.error('Error loading earthquake data:', error);
            this.retryWithBackoff();
        }
    }

    processEarthquakeData(data) {
        const now = Date.now();
        const oneDayAgo = now - (24 * 60 * 60 * 1000);

        // Filter earthquakes from last 24 hours and magnitude >= 2.5
        const filteredFeatures = data.features.filter(feature => {
            const props = feature.properties;
            const eventTime = props.time;
            const magnitude = props.mag;
            
            return eventTime >= oneDayAgo && magnitude >= 2.5;
        });

        // Limit to 1500 features for performance
        const limitedFeatures = filteredFeatures
            .sort((a, b) => b.properties.time - a.properties.time)
            .slice(0, 1500);

        // Process features for Mapbox GL compatibility
        limitedFeatures.forEach(feature => {
            const coords = feature.geometry.coordinates;
            const props = feature.properties;
            
            // Add depth property for styling (convert negative depth to positive)
            props.depth = Math.abs(coords[2]) || 0;
            
            // Ensure magnitude is available
            if (!props.mag) {
                props.mag = 0;
            }
        });

        this.earthquakeData = limitedFeatures;
        this.lastUpdateTime = now;

        // Update map data with fade-in animation
        if (this.map.getSource('earthquakes')) {
            this.animateNewEarthquakes(limitedFeatures);
        }
    }

    animateNewEarthquakes(newFeatures) {
        // Create GeoJSON FeatureCollection
        const geojsonData = {
            type: 'FeatureCollection',
            features: newFeatures
        };

        // Update source with new data
        this.map.getSource('earthquakes').setData(geojsonData);

        // Log for debugging
        console.log(`Updated map with ${newFeatures.length} earthquake features`);
    }

    showEarthquakePopup(e) {
        const feature = e.features[0];
        const props = feature.properties;
        const coords = feature.geometry.coordinates;

        const magnitude = props.mag ? props.mag.toFixed(1) : 'Unknown';
        const depth = Math.abs(coords[2]).toFixed(1);
        const time = new Date(props.time).toUTCString();
        const place = props.place || 'Unknown location';

        const popupContent = `
            <div class="earthquake-popup">
                <h4>M ${magnitude} Earthquake</h4>
                <p><strong>Location:</strong> ${place}</p>
                <p><strong>Depth:</strong> ${depth} km</p>
                <p><strong>Time:</strong> ${time}</p>
                ${props.url ? `<a href="${props.url}" target="_blank" rel="noopener">More info on USGS</a>` : ''}
            </div>
        `;

        new mapboxgl.Popup()
            .setLngLat([coords[0], coords[1]])
            .setHTML(popupContent)
            .addTo(this.map);
    }

    updateUI() {
        const countElement = document.getElementById('earthquake-count');
        const updateElement = document.getElementById('last-update');

        if (countElement) {
            countElement.textContent = `${this.earthquakeData.length} earthquakes`;
        }

        if (updateElement && this.lastUpdateTime) {
            const updateTime = new Date(this.lastUpdateTime).toLocaleTimeString();
            updateElement.textContent = `Last update: ${updateTime}`;
        }
    }

    startAutoRefresh() {
        // Refresh every 60 seconds
        this.refreshInterval = setInterval(() => {
            this.loadEarthquakeData();
        }, 60000);
    }

    retryWithBackoff(attempt = 1) {
        const maxAttempts = 3;
        const baseDelay = 2000;
        
        if (attempt <= maxAttempts) {
            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.log(`Retrying earthquake data fetch in ${delay}ms (attempt ${attempt}/${maxAttempts})`);
            
            setTimeout(() => {
                this.loadEarthquakeData();
            }, delay);
        } else {
            console.error('Max retry attempts reached for earthquake data');
        }
    }

    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        if (this.map) {
            this.map.remove();
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new EarthquakeGlobe();
});