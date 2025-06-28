#!/usr/bin/env python3
"""
Enhanced Transform script for Telegram ETL pipeline
Implements LLM-powered geolocation with Mapbox geocoding
"""

import json
import re
import os
import glob
import yaml
import time
import requests
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any
import logging
from dataclasses import dataclass

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # If python-dotenv is not installed, continue without it
    pass

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class GeolocationResult:
    """Result of geolocation processing"""
    lat: Optional[float] = None
    lon: Optional[float] = None
    country_code: Optional[str] = None
    confidence: float = 0.0
    source: str = "none"
    place_name: Optional[str] = None
    geocoding_attempts: List[str] = None
    
    def __post_init__(self):
        if self.geocoding_attempts is None:
            self.geocoding_attempts = []

def load_country_data():
    """Load country mappings from YAML file"""
    try:
        with open('countries.yml', 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
            return data['flag_to_country'], data['country_centroids']
    except FileNotFoundError:
        logger.error("countries.yml not found, using fallback data")
        return {}, {}
    except Exception as e:
        logger.error(f"Error loading countries.yml: {e}")
        return {}, {}

# Load country data from YAML
FLAG_TO_COUNTRY, COUNTRY_CENTROIDS = load_country_data()

class MapboxGeocoder:
    """Mapbox geocoding service integration"""
    
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.base_url = "https://api.mapbox.com/geocoding/v5/mapbox.places"
        self.rate_limit_delay = 0.1  # 100ms between requests
        
    def geocode(self, query: str, country_code: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Geocode a location query using Mapbox"""
        try:
            params = {
                'access_token': self.access_token,
                'q': query,
                'types': 'place,locality,neighborhood,address',
                'limit': 1
            }
            
            if country_code:
                params['country'] = country_code
                
            response = requests.get(f"{self.base_url}/{query}.json", params=params)
            response.raise_for_status()
            
            data = response.json()
            if data.get('features'):
                feature = data['features'][0]
                coords = feature['geometry']['coordinates']
                return {
                    'lat': coords[1],
                    'lon': coords[0],
                    'place_name': feature.get('place_name', query),
                    'relevance': feature.get('relevance', 0.0),
                    'type': feature.get('place_type', [])[0] if feature.get('place_type') else 'unknown'
                }
            
            time.sleep(self.rate_limit_delay)
            return None
            
        except Exception as e:
            logger.warning(f"Geocoding failed for '{query}': {e}")
            time.sleep(self.rate_limit_delay)
            return None

class LLMGeolocator:
    """LLM-powered location entity extraction and geocoding"""
    
    def __init__(self, mapbox_token: str):
        self.mapbox = MapboxGeocoder(mapbox_token)
        
    def extract_location_entities(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract location entities from text using LLM-like pattern matching
        This is a simplified version - in production you'd use OpenAI API
        """
        locations = []
        
        # Common location patterns
        patterns = [
            # City, Country format
            r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
            # City in Country format
            r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
            # Standalone city names (capitalized)
            r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b',
        ]
        
        for pattern in patterns:
            matches = re.finditer(pattern, text)
            for match in matches:
                if pattern == patterns[0]:  # City, Country
                    city, country = match.groups()
                    locations.append({
                        'type': 'city_country',
                        'city': city.strip(),
                        'country': country.strip(),
                        'query': f"{city.strip()}, {country.strip()}",
                        'confidence': 0.8
                    })
                elif pattern == patterns[1]:  # City in Country
                    city, country = match.groups()
                    locations.append({
                        'type': 'city_in_country',
                        'city': city.strip(),
                        'country': country.strip(),
                        'query': f"{city.strip()}, {country.strip()}",
                        'confidence': 0.7
                    })
                else:  # Standalone city
                    city = match.group(1)
                    # Filter out common non-location words
                    if len(city) > 2 and city.lower() not in ['the', 'and', 'for', 'with', 'from', 'this', 'that']:
                        locations.append({
                            'type': 'city_only',
                            'city': city.strip(),
                            'country': None,
                            'query': city.strip(),
                            'confidence': 0.4
                        })
        
        return locations
    
    def geocode_locations(self, locations: List[Dict[str, Any]]) -> List[GeolocationResult]:
        """Geocode extracted location entities"""
        results = []
        
        for location in locations:
            result = GeolocationResult()
            result.geocoding_attempts.append(f"LLM extracted: {location['query']}")
            
            # Try geocoding
            geocode_result = self.mapbox.geocode(location['query'])
            
            if geocode_result:
                result.lat = geocode_result['lat']
                result.lon = geocode_result['lon']
                result.place_name = geocode_result['place_name']
                result.confidence = location['confidence'] * geocode_result['relevance']
                result.source = f"llm_geocoding_{location['type']}"
                result.geocoding_attempts.append(f"Geocoded successfully: {geocode_result['place_name']}")
            else:
                result.confidence = 0.0
                result.geocoding_attempts.append("Geocoding failed")
            
            results.append(result)
        
        return results

def extract_coordinates(text: str) -> Optional[Tuple[float, float]]:
    """Extract coordinates from text using regex patterns"""
    # Various coordinate patterns
    patterns = [
        # Decimal degrees: 40.7128, -74.0060
        r'(-?\d+\.\d+),\s*(-?\d+\.\d+)',
        # Degrees minutes seconds: 40°42'51"N, 74°00'21"W
        r'(\d+)°(\d+)\'(\d+\.?\d*)"([NS]),\s*(\d+)°(\d+)\'(\d+\.?\d*)"([EW])',
        # Simple lat/lon: lat: 40.7128, lon: -74.0060
        r'lat:\s*(-?\d+\.\d+).*?lon:\s*(-?\d+\.\d+)',
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, text)
        if matches:
            if len(matches[0]) == 2:  # Decimal degrees
                try:
                    lat, lon = float(matches[0][0]), float(matches[0][1])
                    if -90 <= lat <= 90 and -180 <= lon <= 180:
                        return (lat, lon)
                except ValueError:
                    continue
            elif len(matches[0]) == 8:  # DMS format
                try:
                    lat_deg, lat_min, lat_sec, lat_dir = int(matches[0][0]), int(matches[0][1]), float(matches[0][2]), matches[0][3]
                    lon_deg, lon_min, lon_sec, lon_dir = int(matches[0][4]), int(matches[0][5]), float(matches[0][6]), matches[0][7]
                    
                    lat = lat_deg + lat_min/60 + lat_sec/3600
                    lon = lon_deg + lon_min/60 + lon_sec/3600
                    
                    if lat_dir == 'S': lat = -lat
                    if lon_dir == 'W': lon = -lon
                    
                    if -90 <= lat <= 90 and -180 <= lon <= 180:
                        return (lat, lon)
                except ValueError:
                    continue
    
    return None

def extract_flag_countries(text: str) -> List[str]:
    """Extract country codes from flag emojis"""
    countries = []
    for flag, country_code in FLAG_TO_COUNTRY.items():
        if flag in text:
            countries.append(country_code)
    return countries

def extract_place_names(text: str) -> List[str]:
    """Extract potential place names from text"""
    # Simple place name extraction - could be enhanced with NER
    place_patterns = [
        r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b',  # Capitalized words
        r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z][a-z]+)\b',  # City, Country
    ]
    
    places = []
    for pattern in place_patterns:
        matches = re.findall(pattern, text)
        for match in matches:
            if isinstance(match, tuple):
                places.append(', '.join(match))
            else:
                places.append(match)
    
    return list(set(places))  # Remove duplicates

def get_country_centroid(country_code: str) -> Optional[Tuple[float, float]]:
    """Get country centroid coordinates"""
    if country_code in COUNTRY_CENTROIDS:
        centroid = COUNTRY_CENTROIDS[country_code]
        return (centroid['lat'], centroid['lon'])
    return None

def calculate_confidence_score(result: GeolocationResult, message: Dict) -> float:
    """Calculate confidence score based on various factors"""
    base_confidence = result.confidence
    
    # Boost confidence for exact coordinates
    if result.source.startswith('coordinates'):
        base_confidence = max(base_confidence, 0.95)
    
    # Boost for flag emojis
    if result.source.startswith('flag'):
        base_confidence = max(base_confidence, 0.85)
    
    # Boost for successful geocoding
    if result.source.startswith('llm_geocoding'):
        base_confidence = max(base_confidence, 0.7)
    
    # Penalize for country centroids
    if result.source.startswith('country_centroid'):
        base_confidence = min(base_confidence, 0.5)
    
    # Penalize for channel fallback
    if result.source.startswith('channel_fallback'):
        base_confidence = min(base_confidence, 0.3)
    
    return min(base_confidence, 1.0)

def process_message(message: Dict, llm_geolocator: LLMGeolocator) -> Dict:
    """Process a single message and extract geolocation data"""
    text = message.get('text', '')
    channel = message.get('channel', '')
    
    result = GeolocationResult()
    
    # Step 1: Try exact coordinates first (highest confidence)
    coords = extract_coordinates(text)
    if coords:
        result.lat, result.lon = coords
        result.confidence = 0.95
        result.source = "coordinates_regex"
        result.geocoding_attempts.append(f"Found coordinates: {coords}")
        return result.__dict__
    
    # Step 2: Try flag emojis
    flag_countries = extract_flag_countries(text)
    if flag_countries:
        country_code = flag_countries[0]  # Take first flag
        centroid = get_country_centroid(country_code)
        if centroid:
            result.lat, result.lon = centroid
            result.country_code = country_code
            result.confidence = 0.85
            result.source = "flag_emoji"
            result.geocoding_attempts.append(f"Found flag: {country_code}")
            return result.__dict__
    
    # Step 3: Try LLM-powered location extraction and geocoding
    if len(text) > 10:  # Only process substantial text
        locations = llm_geolocator.extract_location_entities(text)
        if locations:
            geocode_results = llm_geolocator.geocode_locations(locations)
            
            # Find the best result
            best_result = max(geocode_results, key=lambda x: x.confidence)
            if best_result.confidence > 0.3:  # Minimum threshold
                result = best_result
                result.confidence = calculate_confidence_score(result, message)
                return result.__dict__
    
    # Step 4: Try simple place name extraction
    place_names = extract_place_names(text)
    if place_names:
        # Try geocoding the first place name
        geocode_result = llm_geolocator.mapbox.geocode(place_names[0])
        if geocode_result:
            result.lat = geocode_result['lat']
            result.lon = geocode_result['lon']
            result.place_name = geocode_result['place_name']
            result.confidence = 0.4
            result.source = "place_name_geocoding"
            result.geocoding_attempts.append(f"Geocoded place: {place_names[0]}")
            return result.__dict__
    
    # Step 5: Channel context fallback
    channel_country_map = {
        'militarysummary': 'UKR',
        'ClashReport': 'UKR',
        'ukraine_world': 'UKR',
        'russia_news': 'RUS',
        'middle_east_news': 'ISR',
    }
    
    if channel in channel_country_map:
        country_code = channel_country_map[channel]
        centroid = get_country_centroid(country_code)
        if centroid:
            result.lat, result.lon = centroid
            result.country_code = country_code
            result.confidence = 0.2
            result.source = "channel_fallback"
            result.geocoding_attempts.append(f"Channel fallback: {country_code}")
            return result.__dict__
    
    # No geolocation found
    result.confidence = 0.0
    result.source = "none"
    result.geocoding_attempts.append("No geolocation found")
    return result.__dict__

def process_file(input_file: str, output_file: str, mapbox_token: str):
    """Process a single JSONL file"""
    llm_geolocator = LLMGeolocator(mapbox_token)
    
    processed_count = 0
    geolocated_count = 0
    
    with open(input_file, 'r', encoding='utf-8') as infile, \
         open(output_file, 'w', encoding='utf-8') as outfile:
        
        for line in infile:
            try:
                message = json.loads(line.strip())
                geolocation = process_message(message, llm_geolocator)
                
                # Add geolocation data to message
                message['geolocation'] = geolocation
                
                # Add processing metadata
                message['processed_at'] = datetime.utcnow().isoformat()
                message['processing_version'] = 'enhanced_v1'
                
                outfile.write(json.dumps(message, ensure_ascii=False) + '\n')
                processed_count += 1
                
                if geolocation.get('lat') and geolocation.get('lon'):
                    geolocated_count += 1
                    
            except json.JSONDecodeError as e:
                logger.warning(f"Invalid JSON in {input_file}: {e}")
                continue
            except Exception as e:
                logger.error(f"Error processing message in {input_file}: {e}")
                continue
    
    logger.info(f"Processed {processed_count} messages, geolocated {geolocated_count} ({geolocated_count/processed_count*100:.1f}%)")
    return processed_count, geolocated_count

def main():
    """Main processing function"""
    # Get Mapbox token from environment
    mapbox_token = os.getenv('MAPBOX_ACCESS_TOKEN')
    if not mapbox_token:
        logger.error("MAPBOX_ACCESS_TOKEN environment variable not set")
        return
    
    # Process all unprocessed files
    input_dir = "data/unprocessed"
    output_dir = "data/processed"
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    input_files = glob.glob(os.path.join(input_dir, "*.jsonl"))
    
    if not input_files:
        logger.info("No unprocessed files found")
        return
    
    total_processed = 0
    total_geolocated = 0
    
    for input_file in input_files:
        filename = os.path.basename(input_file)
        output_file = os.path.join(output_dir, f"enhanced_{filename}")
        
        logger.info(f"Processing {filename}...")
        processed, geolocated = process_file(input_file, output_file, mapbox_token)
        
        total_processed += processed
        total_geolocated += geolocated
    
    logger.info(f"Total: {total_processed} messages processed, {total_geolocated} geolocated ({total_geolocated/total_processed*100:.1f}%)")

if __name__ == "__main__":
    main() 