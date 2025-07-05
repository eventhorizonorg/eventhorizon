// Mapbox access token will be loaded from environment
let MAPBOX_TOKEN;

// Initialize the map after loading the token
async function initMap() {
    try {
        // Fetch the Mapbox token from the server
        const response = await fetch('/api/mapbox-token');
        const data = await response.json();
        
        if (data.error) {
            console.error('Failed to load Mapbox token:', data.error);
            return;
        }
        
        MAPBOX_TOKEN = data.token;
        mapboxgl.accessToken = MAPBOX_TOKEN;

        // Create the map with dark preset for grey/black appearance
        const map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [0, 0],
            zoom: 1.5,
            projection: 'globe',
            pitch: 0,
            bearing: 0
        });

        // Add pure black space with minimal stars and darker water
        map.on('load', () => {
            // Set fog for space background
            map.setFog({
                'color': '#000000',
                'high-color': '#000000',
                'horizon-blend': 0.0,
                'space-color': '#000000',
                'star-intensity': 0.3
            });
            
            // Make water darker
            map.setPaintProperty('water', 'fill-color', '#0a0a0a');
            map.setPaintProperty('water', 'fill-opacity', 0.8);
        });
        
    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

// Initialize the map when the page loads
document.addEventListener('DOMContentLoaded', initMap); 