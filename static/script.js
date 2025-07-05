// Mapbox access token will be loaded from environment
let MAPBOX_TOKEN;
let map;

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

        // Add pure black space with minimal stars and darker water
        map.on('load', async () => {
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
            
            // Load and plot Telegram messages
            await loadAndPlotMessages();
        });
        
    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

// Fetch and plot Telegram messages
async function loadAndPlotMessages() {
    try {
        console.log('Loading Telegram messages...');
        const response = await fetch('/api/messages');
        const data = await response.json();
        
        if (data.error) {
            console.error('Failed to load messages:', data.error);
            return;
        }
        
        console.log(`Loaded ${data.count} geolocated messages`);
        
        // Plot each message as a marker
        data.messages.forEach(message => {
            if (message.latitude && message.longitude) {
                plotMessage(message);
            }
        });
        
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Plot a single message on the map
function plotMessage(message) {
    // Create a custom marker element
    const markerEl = document.createElement('div');
    markerEl.className = 'telegram-marker';
    markerEl.style.width = '12px';
    markerEl.style.height = '12px';
    markerEl.style.borderRadius = '50%';
    markerEl.style.backgroundColor = '#ff4444';
    markerEl.style.border = '2px solid #ffffff';
    markerEl.style.cursor = 'pointer';
    markerEl.style.boxShadow = '0 0 10px rgba(255, 68, 68, 0.5)';
    
    // Create the marker
    const marker = new mapboxgl.Marker(markerEl)
        .setLngLat([message.longitude, message.latitude])
        .addTo(map);
    
    // Create popup content
    const popupContent = `
        <div class="message-popup">
            <h4>📢 ${message.channel}</h4>
            <p><strong>Date:</strong> ${new Date(message.date).toLocaleString()}</p>
            <p><strong>Location:</strong> ${message.latitude.toFixed(4)}, ${message.longitude.toFixed(4)}</p>
            ${message.country_code ? `<p><strong>Country:</strong> ${message.country_code}</p>` : ''}
            <div class="message-text">
                <strong>Message:</strong><br>
                ${message.text.length > 200 ? message.text.substring(0, 200) + '...' : message.text}
            </div>
        </div>
    `;
    
    // Create popup
    const popup = new mapboxgl.Popup({
        closeButton: true,
        maxWidth: '300px'
    }).setHTML(popupContent);
    
    // Add click event to marker
    markerEl.addEventListener('click', () => {
        marker.setPopup(popup);
        popup.addTo(map);
    });
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