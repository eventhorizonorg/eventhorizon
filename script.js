// Minimal Mapbox + Telegram events script
mapboxgl.accessToken = MAPBOX_TOKEN;

// Initialize Supabase client
const supabase = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/dark-v11',
  center: [32, 49],
  zoom: 4
});

// Global variables for data management
let allTelegramData = null;
let currentDayData = null;
let hoveredPoint = null;
let popup = null;
let highlightedCountry = null;
let selectedCountry = null;

// Function to get country code from coordinates using Mapbox Geocoding API
async function getCountryFromCoordinates(lng, lat) {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=country&access_token=${mapboxgl.accessToken}`
    );
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      return data.features[0].properties.short_code?.toUpperCase();
    }
  } catch (error) {
    console.error('Error getting country from coordinates:', error);
  }
  return null;
}

// Highlight country borders
function highlightCountry(iso_a3, fillColor = '#90caf9', fillOpacity = 0.15, borderColor = '#42a5f5') {
  if (!iso_a3) return;
  
  // Remove existing highlight if different country
  if (highlightedCountry && highlightedCountry !== iso_a3) {
    clearCountryHighlight();
  }
  
  // Don't re-add if already highlighted
  if (highlightedCountry === iso_a3) return;
  
  map.addSource(iso_a3 + '-border', {
    type: 'vector',
    url: 'mapbox://mapbox.country-boundaries-v1'
  });
  
  map.addLayer({
    id: iso_a3 + '-fill',
    type: 'fill',
    source: iso_a3 + '-border',
    'source-layer': 'country_boundaries',
    filter: ['==', ['get', 'iso_3166_1_alpha_3'], iso_a3],
    paint: {
      'fill-color': fillColor,
      'fill-opacity': fillOpacity
    }
  });
  
  map.addLayer({
    id: iso_a3 + '-outline',
    type: 'line',
    source: iso_a3 + '-border',
    'source-layer': 'country_boundaries',
    filter: ['==', ['get', 'iso_3166_1_alpha_3'], iso_a3],
    paint: {
      'line-color': borderColor,
      'line-width': 2
    }
  });
  
  highlightedCountry = iso_a3;
}

// Clear country highlight
function clearCountryHighlight() {
  if (!highlightedCountry) return;
  
  const countryCode = highlightedCountry;
  
  // Remove layers if they exist
  if (map.getLayer(countryCode + '-fill')) {
    map.removeLayer(countryCode + '-fill');
  }
  if (map.getLayer(countryCode + '-outline')) {
    map.removeLayer(countryCode + '-outline');
  }
  
  // Remove source if it exists
  if (map.getSource(countryCode + '-border')) {
    map.removeSource(countryCode + '-border');
  }
  
  highlightedCountry = null;
}

// Get current date in YYYY-MM-DD format
function getCurrentDate() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

// Load GeoJSON data from Supabase
async function loadTelegramGeoJSON() {
  try {
    console.log('Loading data from Supabase...');
    
    // Fetch data from your Supabase table
    // Adjust the table name and columns based on your schema
    const { data, error } = await supabase
      .from('telegram_events') // Replace with your actual table name
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log('No data found in Supabase, loading sample data instead');
      // Fallback to sample data if no Supabase data
      const response = await fetch('sample_data.geojson');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      allTelegramData = await response.json();
    } else {
      console.log('Loaded data from Supabase:', data.length, 'records');
      
      // Convert Supabase data to GeoJSON format
      allTelegramData = {
        type: 'FeatureCollection',
        features: data.map(record => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [record.longitude, record.latitude] // Adjust column names as needed
          },
          properties: {
            id: record.id,
            text: record.text || record.message || '',
            channel: record.channel || record.channel_name || '',
            timestamp: record.created_at || record.timestamp,
            media_url: record.media_url || null,
            telegram_url: record.telegram_url || null,
            // Add any other properties from your Supabase schema
            ...record
          }
        }))
      };
    }
    
    console.log('Processed data:', allTelegramData.features.length, 'features');
    
    // Load all data
    loadAllData();
    
  } catch (error) {
    console.error('Error loading data:', error);
    // Fallback to sample data on error
    try {
      const response = await fetch('sample_data.geojson');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      allTelegramData = await response.json();
      loadAllData();
    } catch (fallbackError) {
      console.error('Error loading fallback data:', fallbackError);
    }
  }
}

// Load and display all data (not just current day)
function loadAllData() {
  // Use all sample data
  let allData = allTelegramData.features.map(feature => {
    // Assign a random phase offset for pulsation (0 to 2π)
    feature.properties.pulse_phase = Math.random() * Math.PI * 2;
    // Initialize pulse properties
    feature.properties.pulse_radius = 8;
    feature.properties.pulse_blur = 0.7;
    return feature;
  });

  // Save for animation
  window._allDataForPulse = allData;

  if (map.getSource('telegram-events')) {
    map.getSource('telegram-events').setData({
      type: 'FeatureCollection',
      features: allData
    });
  } else {
    // Add source and layer if they don't exist
    map.addSource('telegram-events', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: allData
      }
    });

    map.addLayer({
      id: 'telegram-event-points',
      type: 'circle',
      source: 'telegram-events',
      paint: {
        // Use per-feature animated properties
        'circle-radius': ['get', 'pulse_radius'],
        'circle-color': '#fff',
        'circle-opacity': 0.85,
        'circle-stroke-width': 0,
        'circle-blur': ['get', 'pulse_blur']
      }
    });

    // Add pulsating animation to the points with per-dot phase
    let pulseStart = null;
    function animatePulse(ts) {
      if (!pulseStart) pulseStart = ts;
      const elapsed = (ts - pulseStart) / 1000; // seconds
      const freq = 0.25; // 0.25 Hz (one pulse every 4 seconds)
      const omega = 2 * Math.PI * freq;
      // Animate each feature's radius and blur
      for (const feature of window._allDataForPulse) {
        const phase = feature.properties.pulse_phase;
        const pulse = 1 + 0.25 * Math.sin(omega * elapsed + phase);
        feature.properties.pulse_radius = 10 * pulse; // base size * pulse
        feature.properties.pulse_blur = 0.7 + 0.5 * Math.abs(Math.sin(omega * elapsed + phase));
      }
      // Update the source data
      if (map.getSource('telegram-events')) {
        map.getSource('telegram-events').setData({
          type: 'FeatureCollection',
          features: window._allDataForPulse
        });
      }
      requestAnimationFrame(animatePulse);
    }
    requestAnimationFrame(animatePulse);

    setupEventListeners();
  }
}

// Setup event listeners for the map
function setupEventListeners() {
  let popupTimeout;
  
  // Hover effects
  map.on('mouseenter', 'telegram-event-points', async (e) => {
    map.getCanvas().style.cursor = 'pointer';
    
    // Clear any existing timeout
    if (popupTimeout) {
      clearTimeout(popupTimeout);
      popupTimeout = null;
    }
    
    // Show quick preview on hover
    const feature = e.features[0];
    const coordinates = feature.geometry.coordinates.slice();
    const properties = feature.properties;
    
    showQuickPreview(coordinates, properties);
    
    // Highlight country on hover
    const countryCode = await getCountryFromCoordinates(coordinates[0], coordinates[1]);
    if (countryCode) {
      highlightCountry(countryCode, '#90caf9', 0.15, '#42a5f5');
    }
  });

  map.on('mouseleave', 'telegram-event-points', () => {
    map.getCanvas().style.cursor = '';
    
    // Clear country highlight on mouse leave (unless clicked)
    if (!selectedCountry) {
      clearCountryHighlight();
    }
    
    // Set a timeout to hide the popup after 2 seconds
    popupTimeout = setTimeout(() => {
      if (popup) {
        popup.remove();
        popup = null;
      }
    }, 2000); // 2 seconds delay
  });
  
  // Click effects
  map.on('click', 'telegram-event-points', async (e) => {
    const feature = e.features[0];
    const coordinates = feature.geometry.coordinates.slice();
    const properties = feature.properties;
    
    // Get country code and highlight it
    const countryCode = await getCountryFromCoordinates(coordinates[0], coordinates[1]);
    if (countryCode) {
      // Clear previous selection
      if (selectedCountry && selectedCountry !== countryCode) {
        clearCountryHighlight();
      }
      
      // Highlight selected country with different color
      highlightCountry(countryCode, '#ff8a80', 0.2, '#e57373');
      selectedCountry = countryCode;
    }
    
    // Show detailed popup on click
    showDetailedPopup(coordinates, properties);
  });
  
  // Keep popup visible when hovering over it
  map.on('mouseenter', '.mapboxgl-popup', () => {
    // Clear the timeout when hovering over the popup
    if (popupTimeout) {
      clearTimeout(popupTimeout);
      popupTimeout = null;
    }
  });
  
  // Start fade timer when leaving the popup
  map.on('mouseleave', '.mapboxgl-popup', () => {
    // Set timeout to hide popup after leaving it
    popupTimeout = setTimeout(() => {
      if (popup) {
        popup.remove();
        popup = null;
      }
    }, 2000); // 2 seconds delay
  });
  
  // Clear selection when clicking on empty map
  map.on('click', (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: ['telegram-event-points'] });
    if (features.length === 0) {
      // Clicked on empty space, clear selection
      if (selectedCountry) {
        clearCountryHighlight();
        selectedCountry = null;
      }
      if (popup) {
        popup.remove();
        popup = null;
      }
    }
  });
}

// Show quick preview on hover
function showQuickPreview(coordinates, properties) {
  if (popup) popup.remove();
  
  const date = new Date(properties.date).toLocaleDateString();
  const time = new Date(properties.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  const text = properties.text ? properties.text.substring(0, 200) + (properties.text.length > 200 ? '...' : '') : 'No text content';
  
  const previewContent = `
    <div class="popup-content">
      <div class="popup-header">
        <div class="popup-date">${date} at ${time}</div>
        <div class="popup-provider">${properties.source_username || 'Telegram'}</div>
      </div>
      <div class="popup-text">${text}</div>
      <div class="popup-footer">
        <a href="${properties.telegram_url}" target="_blank" class="popup-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          View on Telegram
        </a>
      </div>
    </div>
  `;

  popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    className: 'simple-preview'
  })
    .setLngLat(coordinates)
    .setHTML(previewContent)
    .addTo(map);
}

// Show detailed popup on click
function showDetailedPopup(coordinates, properties) {
  if (popup) popup.remove();
  
  const date = new Date(properties.date).toLocaleDateString();
  const time = new Date(properties.date).toLocaleTimeString();
  const text = properties.text || 'No text content';
  const geolocation = properties.geolocation;
  
  let locationInfo = '';
  if (geolocation) {
    const locationParts = [];
    if (geolocation.city) locationParts.push(geolocation.city);
    if (geolocation.region) locationParts.push(geolocation.region);
    if (geolocation.country) locationParts.push(geolocation.country);
    
    locationInfo = `
      <div class="popup-location">
        <div class="location-item">
          <span class="location-label">📍 Location:</span>
          <span class="location-value">${locationParts.join(', ') || 'Unknown'}</span>
        </div>
        <div class="location-item">
          <span class="location-label">🎯 Confidence:</span>
          <span class="location-value">${(geolocation.confidence * 100).toFixed(1)}%</span>
        </div>
        <div class="location-item">
          <span class="location-label">🔍 Source:</span>
          <span class="location-value">${geolocation.source || 'Unknown'}</span>
        </div>
      </div>
    `;
  }
  
  const detailedContent = `
    <div class="popup-content detailed">
      <div class="popup-header">
        <div class="popup-date">${date} at ${time}</div>
        <div class="popup-provider">${properties.source_username || 'Telegram'}</div>
      </div>
      ${locationInfo}
      <div class="popup-text detailed-text">${text}</div>
      <div class="popup-footer">
        <a href="${properties.telegram_url}" target="_blank" class="popup-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          View on Telegram
        </a>
      </div>
    </div>
  `;

  popup = new mapboxgl.Popup({
    closeButton: true,
    closeOnClick: false,
    className: 'detailed-popup'
  })
    .setLngLat(coordinates)
    .setHTML(detailedContent)
    .addTo(map);
}

// Initialize when map loads
map.on('load', () => {
  loadTelegramGeoJSON();
});

// Export functions for future date slider
window.getCurrentDate = getCurrentDate;

// --- ElevenLabs Map Integration ---
class ElevenLabsMapController {
  constructor() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Listen for ElevenLabs widget messages
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'elevenlabs-convai-message') {
        this.handleElevenLabsMessage(event.data.message);
      }
    });
    this.setupShadowDOMCommunication();
    this.observeWidgetChanges();
  }

  setupShadowDOMCommunication() {
    setTimeout(() => {
      const widget = document.querySelector('elevenlabs-convai');
      if (widget && widget.shadowRoot) {
        const shadowRoot = widget.shadowRoot;
        const inputs = shadowRoot.querySelectorAll('input, textarea, [contenteditable="true"]');
        inputs.forEach((input) => {
          input.addEventListener('input', (e) => {
            if (e.target.value && e.target.value.length > 5) {
              this.handleElevenLabsMessage(e.target.value);
            }
          });
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.value) {
              this.handleElevenLabsMessage(e.target.value);
            }
          });
        });
        const shadowObserver = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  const userMessages = node.querySelectorAll('[data-user-message], .user-message, .message.user, .user-input');
                  userMessages.forEach(message => {
                    const text = message.textContent || message.innerText;
                    if (text && text.length > 5) {
                      this.handleElevenLabsMessage(text);
                    }
                  });
                }
              });
            }
          });
        });
        shadowObserver.observe(shadowRoot, { childList: true, subtree: true });
      }
    }, 5000);
  }

  observeWidgetChanges() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const userMessages = node.querySelectorAll('[data-user-message], .user-message, .message.user');
              userMessages.forEach(message => {
                this.handleElevenLabsMessage(message.textContent || message.innerText);
              });
            }
          });
        }
      });
    });
    setTimeout(() => {
      const widget = document.querySelector('elevenlabs-convai');
      if (widget) {
        observer.observe(widget, { childList: true, subtree: true });
      }
    }, 3000);
  }

  handleElevenLabsMessage(message) {
    if (!message) return;
    const locations = this.extractLocations(message);
    if (locations.length > 0) {
      this.panToLocations(locations);
    }
  }

  extractLocations(text) {
    const locations = [];
    const lowerText = text.toLowerCase();
    const regions = {
      'ukraine': { center: [32, 49], zoom: 7, keywords: ['ukraine', 'ukrainian', 'kyiv', 'donetsk', 'luhansk', 'kharkiv', 'odesa', 'lviv'] },
      'russia': { center: [105, 65], zoom: 4, keywords: ['russia', 'russian', 'moscow', 'st petersburg', 'novosibirsk', 'yekaterinburg'] },
      'belarus': { center: [28, 53], zoom: 7, keywords: ['belarus', 'belarusian', 'minsk', 'gomel', 'mogilev'] },
      'moldova': { center: [28.5, 47], zoom: 8, keywords: ['moldova', 'moldovan', 'chisinau', 'tiraspol'] },
      'romania': { center: [25, 46], zoom: 7, keywords: ['romania', 'romanian', 'bucharest', 'cluj', 'timisoara'] },
      'hungary': { center: [20, 47], zoom: 8, keywords: ['hungary', 'hungarian', 'budapest', 'debrecen', 'szeged'] },
      'slovakia': { center: [19.5, 48.5], zoom: 8, keywords: ['slovakia', 'slovak', 'bratislava', 'kosice'] },
      'poland': { center: [20, 52], zoom: 6, keywords: ['poland', 'polish', 'warsaw', 'krakow', 'gdansk', 'wroclaw'] },
      'europe': { center: [10, 50], zoom: 5, keywords: ['europe', 'european', 'eu', 'european union'] },
      'middle east': { center: [35, 30], zoom: 5, keywords: ['middle east', 'israel', 'palestine', 'lebanon', 'syria', 'jordan', 'iraq', 'iran', 'tehran', 'tel aviv', 'jerusalem', 'gaza', 'west bank'] },
      'iran': { center: [53, 32], zoom: 6, keywords: ['iran', 'iranian', 'tehran', 'persian'] },
      'israel': { center: [34.8, 31.5], zoom: 7, keywords: ['israel', 'israeli', 'tel aviv', 'jerusalem', 'gaza', 'west bank', 'palestine', 'palestinian'] },
      'asia': { center: [100, 35], zoom: 4, keywords: ['asia', 'asian', 'china', 'japan', 'korea', 'india', 'pakistan'] },
      'africa': { center: [20, 0], zoom: 4, keywords: ['africa', 'african', 'egypt', 'nigeria', 'south africa', 'kenya'] },
      'americas': { center: [-100, 40], zoom: 4, keywords: ['america', 'american', 'usa', 'united states', 'canada', 'mexico', 'brazil', 'argentina'] }
    };
    Object.entries(regions).forEach(([region, data]) => {
      if (data.keywords.some(keyword => lowerText.includes(keyword))) {
        locations.push({ name: region, ...data });
      }
    });
    return locations;
  }

  panToLocations(locations) {
    if (locations.length === 0) return;
    if (locations.length === 1) {
      const location = locations[0];
      this.panToLocation(location);
    } else {
      const avgCenter = locations.reduce((acc, loc) => {
        return [acc[0] + loc.center[0], acc[1] + loc.center[1]];
      }, [0, 0]).map(coord => coord / locations.length);
      const avgZoom = Math.min(...locations.map(loc => loc.zoom)) - 1;
      this.panToLocation({
        name: 'multiple regions',
        center: avgCenter,
        zoom: avgZoom
      });
    }
  }

  panToLocation(location) {
    map.flyTo({
      center: location.center,
      zoom: location.zoom,
      duration: 2000,
      essential: true
    });
    this.highlightRegion(location);
  }

  highlightRegion(location) {
    this.clearRegionHighlight();
    if (location.name === 'ukraine' || location.name === 'russia') {
      const countryCode = location.name === 'ukraine' ? 'UKR' : 'RUS';
      highlightCountry(countryCode, 0.2);
    } else if (location.name === 'iran') {
      highlightCountry('IRN', 0.2);
    } else if (location.name === 'israel') {
      highlightCountry('ISR', 0.2);
    }
  }

  clearRegionHighlight() {
    clearCountryHighlight();
  }

  triggerLocationSearch(location) {
    this.handleElevenLabsMessage(location);
  }
}

// Initialize the ElevenLabs map controller
const elevenLabsController = new ElevenLabsMapController();

// Global function for testing location detection
window.testLocationSearch = function(location) {
  elevenLabsController.triggerLocationSearch(location);
};