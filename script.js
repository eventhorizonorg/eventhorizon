mapboxgl.accessToken = MAPBOX_TOKEN;

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/dark-v11',
  center: [32, 49],
  zoom: 4
});

// Highlight Russia and Ukraine borders
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

// Wartime sets
highlightCountry('UKR', '#90caf9', 0.08, '#42a5f5'); // Very transparent pastel blue for Ukraine
highlightCountry('RUS', '#ff8a80', 0.08, '#e57373'); // Very transparent pastel red for Russia
highlightCountry('IRN', '#ffd54f', 0.10, '#ffb300'); // Iran - yellow
highlightCountry('ISR', '#b39ddb', 0.10, '#7e57c2'); // Israel - purple
highlightCountry('IND', '#80cbc4', 0.10, '#00897b'); // India - teal
highlightCountry('PAK', '#a5d6a7', 0.10, '#388e3c'); // Pakistan - green