// Minimal Mapbox + Telegram events script
mapboxgl.accessToken = MAPBOX_TOKEN;

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/dark-v11',
  center: [32, 49],
  zoom: 4
});

// Highlight Russia and Ukraine borders only
function highlightCountry(iso_a3, fillColor, fillOpacity, borderColor) {
  map.on('load', () => {
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
  });
}

// highlightCountry('UKR', '#90caf9', 0.08, '#42a5f5');
// highlightCountry('RUS', '#ff8a80', 0.08, '#e57373');

// Global variables for data management
let allTelegramData = null;
let currentDayData = null;
let hoveredPoint = null;
let popup = null;

// Get current date in YYYY-MM-DD format
function getCurrentDate() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

// Filter data by date and quality
function filterDataByDate(data, date) {
  if (!data || !data.features) return [];
  
  return data.features.filter(feature => {
    const featureDate = feature.properties.date?.split('T')[0];
    const hasValidDate = featureDate === date;
    
    // Only include points with reasonable geolocation
    const geolocation = feature.properties.geolocation;
    const hasValidGeolocation = geolocation && 
                               geolocation.lat && 
                               geolocation.lon && 
                               geolocation.confidence > 0.5 &&
                               geolocation.source !== 'llm_geocoding_city_only'; // Filter out bad LLM results
    
    return hasValidDate && hasValidGeolocation;
  });
}

// Load GeoJSON data
async function loadTelegramGeoJSON() {
  try {
    const response = await fetch('tg-etl/data/geojson/filtered_telegram_data.geojson');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    allTelegramData = await response.json();
    console.log('Loaded all Telegram data:', allTelegramData.features.length, 'features');
    
    // Load all data
    loadAllData();
    
  } catch (error) {
    console.error('Error loading Telegram GeoJSON:', error);
  }
}

// Load and display all data (not just current day)
function loadAllData() {
  // Use all data instead of filtering by current date
  const allData = allTelegramData.features.filter(feature => {
    // Only include points with reasonable geolocation
    const geolocation = feature.properties.geolocation;
    const hasValidGeolocation = geolocation && 
                               geolocation.confidence > 0.5 &&
                               geolocation.source !== 'llm_geocoding_city_only'; // Filter out bad LLM results
    
    return hasValidGeolocation;
  });
  
  console.log('All valid data:', allData.length, 'features');
  
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
        'circle-radius': 6,
        'circle-color': '#ffffff',
        'circle-opacity': 0.9,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.6
      }
    });

    // Add event listeners
    setupEventListeners();
  }
}

// Setup event listeners for the map
function setupEventListeners() {
  let popupTimeout;
  
  // Hover effects only
  map.on('mouseenter', 'telegram-event-points', (e) => {
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
  });

  map.on('mouseleave', 'telegram-event-points', () => {
    map.getCanvas().style.cursor = '';
    
    // Set a timeout to hide the popup after 2 seconds
    popupTimeout = setTimeout(() => {
      if (popup) {
        popup.remove();
        popup = null;
      }
    }, 2000); // 2 seconds delay
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
}

// Show quick preview on hover
function showQuickPreview(coordinates, properties) {
  if (popup) popup.remove();
  
  const date = new Date(properties.date).toLocaleDateString();
  const text = properties.text ? properties.text.substring(0, 300) + (properties.text.length > 300 ? '...' : '') : 'No text content';
  
  const previewContent = `
    <div style="max-width:350px; padding:15px; font-family:Arial,sans-serif; line-height:1.5; word-break:break-word; white-space:pre-line;">
      <div style="font-size:12px; color:#666; margin-bottom:10px;">${date}</div>
      <div style="font-size:14px; margin-bottom:15px;">${text}</div>
      <div style="font-size:12px; color:#0066cc;">
        <a href="${properties.telegram_url}" target="_blank" style="color:#0066cc; text-decoration:none;">View on Telegram</a>
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

// Date slider functionality (for future implementation)
function updateDataByDate(date) {
  if (!allTelegramData) return;
  
  const filteredData = filterDataByDate(allTelegramData, date);
  console.log('Updated data for', date, ':', filteredData.length, 'features');
  
  if (map.getSource('telegram-events')) {
    map.getSource('telegram-events').setData({
      type: 'FeatureCollection',
      features: filteredData
    });
  }
}

// Initialize when map loads
map.on('load', () => {
  loadTelegramGeoJSON();
});

// Export functions for future date slider
window.updateDataByDate = updateDataByDate;
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
    // Optionally implement if you want to clear highlights
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