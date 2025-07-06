// Mapbox access token will be loaded from environment
let MAPBOX_TOKEN;
let map;
let pulseStart = Date.now();

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
        map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/dark-v11',
            center: [0, 0],
            zoom: 1.5,
            projection: 'globe',
            pitch: 0,
            bearing: 0
        });

        map.on('load', async () => {
            // Set fog for space background
            map.setFog({
                'color': '#000000',
                'high-color': '#000000',
                'horizon-blend': 0.0,
                'space-color': '#000000',
                'star-intensity': 0.3
            });
            map.setPaintProperty('water', 'fill-color', '#0a0a0a');
            map.setPaintProperty('water', 'fill-opacity', 0.8);
            // Load and plot Telegram messages as GeoJSON
            await loadAndPlotMessagesGeoJSON();
            // Start pulse animation
            animatePulse();
        });
        
    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

// Fetch and plot Telegram messages as GeoJSON
async function loadAndPlotMessagesGeoJSON() {
    try {
        const response = await fetch('/api/messages');
        const data = await response.json();
        if (data.error) {
            console.error('Failed to load messages:', data.error);
            return;
        }
        // Convert to GeoJSON FeatureCollection
        const features = data.messages.map((msg, i) => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [msg.longitude, msg.latitude]
            },
            properties: {
                id: msg.id,
                text: msg.text,
                date: msg.date,
                channel: msg.channel,
                country_code: msg.country_code,
                phase: (i * 2 * Math.PI) / data.messages.length // phase offset for pulse
            }
        }));
        const geojson = {
            type: 'FeatureCollection',
            features
        };
        // Add source
        if (map.getSource('telegram-points')) {
            map.getSource('telegram-points').setData(geojson);
        } else {
            map.addSource('telegram-points', {
                type: 'geojson',
                data: geojson
            });
            // Add circle layer
            map.addLayer({
                id: 'telegram-points-layer',
                type: 'circle',
                source: 'telegram-points',
                paint: {
                    'circle-radius': [
                        'interpolate',
                        ['linear'],
                        ['get', 'pulse'],
                        0, 5,
                        1, 10
                    ],
                    'circle-color': '#fff',
                    'circle-blur': [
                        'interpolate',
                        ['linear'],
                        ['get', 'pulse'],
                        0, 0.2,
                        1, 0.7
                    ],
                    'circle-opacity': 0.9,
                    'circle-stroke-width': 0,
                }
            });
        }
        // Add popup on hover (fade in/out, stays open if hovering popup)
        let hoverPopup = new mapboxgl.Popup({ closeButton: true, maxWidth: '300px' });
        let popupOpen = false;
        let popupShouldClose = false;
        function closePopupWithFade() {
            const popupEl = document.querySelector('.mapboxgl-popup-content .fade-in');
            if (popupEl) {
                popupEl.classList.remove('fade-in');
                popupEl.classList.add('fade-out');
                setTimeout(() => hoverPopup.remove(), 200);
            } else {
                hoverPopup.remove();
            }
            popupOpen = false;
        }
        map.on('mouseenter', 'telegram-points-layer', (e) => {
            map.getCanvas().style.cursor = 'pointer';
            const feature = e.features[0];
            const props = feature.properties;
            const coordinates = feature.geometry.coordinates.slice();
            const popupContent = `
                <div class="message-popup fade-in" id="telegram-hover-popup">
                    <h4>📢 ${props.channel}</h4>
                    <p><strong>Date:</strong> ${new Date(props.date).toLocaleString()}</p>
                    <p><strong>Location:</strong> ${parseFloat(coordinates[1]).toFixed(4)}, ${parseFloat(coordinates[0]).toFixed(4)}</p>
                    ${props.country_code ? `<p><strong>Country:</strong> ${props.country_code}</p>` : ''}
                    <div class="message-text">
                        <strong>Message:</strong><br>
                        ${props.text}
                    </div>
                </div>
            `;
            hoverPopup.setLngLat(coordinates).setHTML(popupContent).addTo(map);
            popupOpen = true;
            popupShouldClose = false;
            setTimeout(() => {
                const popupDiv = document.getElementById('telegram-hover-popup');
                if (popupDiv) {
                    popupDiv.addEventListener('mouseenter', () => {
                        popupShouldClose = false;
                    });
                    popupDiv.addEventListener('mouseleave', () => {
                        popupShouldClose = true;
                        setTimeout(() => {
                            if (popupShouldClose) closePopupWithFade();
                        }, 10);
                    });
                }
            }, 10);
        });
        map.on('mouseleave', 'telegram-points-layer', () => {
            map.getCanvas().style.cursor = '';
            popupShouldClose = true;
            setTimeout(() => {
                if (popupShouldClose && popupOpen) closePopupWithFade();
            }, 10);
        });
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Animate pulse for all points with phase offset
function animatePulse() {
    if (!map || !map.getSource('telegram-points')) return;
    const geojson = map.getSource('telegram-points')._data;
    const now = Date.now();
    const t = ((now - pulseStart) / 1000) % 2; // 2s period
    geojson.features.forEach(f => {
        // Pulse: 0..1..0 (sinusoidal)
        const phase = f.properties.phase || 0;
        f.properties.pulse = 0.5 * (1 + Math.sin(2 * Math.PI * t / 2 + phase));
    });
    map.getSource('telegram-points').setData(geojson);
    requestAnimationFrame(animatePulse);
}

// Test Supabase connection
async function testConnection() {
    try {
        const response = await fetch('/api/supabase-test');
        const data = await response.json();
        
        if (data.status === 'success') {
            console.log('✅ Supabase connection successful');
            console.log(`📊 Found ${data.message_count} sample messages`);
            if (data.sample_messages && data.sample_messages.length > 0) {
                console.log('📝 Sample message:', data.sample_messages[0]);
            }
        } else {
            console.error('❌ Supabase connection failed:', data.message);
        }
    } catch (error) {
        console.error('❌ Connection test failed:', error);
    }
}

// Initialize the map when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    await initMap();
    await testConnection();
}); 