#!/usr/bin/env python3
"""
Enhanced Transform script with LLM-powered geolocation
Uses OpenAI to extract location entities and Mapbox to geocode them
"""

import json
import re
import os
import glob
import yaml
import time
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any
import logging
from dataclasses import dataclass

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from llm_geolocator import geo_pipeline, GeoState, GeolocationResult

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ProcessingResult:
    """Result of message processing"""
    message: Dict
    geolocation_results: List[GeolocationResult]
    processing_time: float

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
            match = matches[0]
            if len(match) == 2:  # Decimal degrees
                try:
                    lat, lon = float(match[0]), float(match[1])
                    if -90 <= lat <= 90 and -180 <= lon <= 180:
                        return lat, lon
                except ValueError:
                    continue
            elif len(match) == 8:  # DMS format
                try:
                    lat_deg, lat_min, lat_sec, lat_dir = int(match[0]), int(match[1]), float(match[2]), match[3]
                    lon_deg, lon_min, lon_sec, lon_dir = int(match[4]), int(match[5]), float(match[6]), match[7]
                    
                    lat = lat_deg + lat_min/60 + lat_sec/3600
                    lon = lon_deg + lon_min/60 + lon_sec/3600
                    
                    if lat_dir == 'S': lat = -lat
                    if lon_dir == 'W': lon = -lon
                    
                    if -90 <= lat <= 90 and -180 <= lon <= 180:
                        return lat, lon
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

def get_country_centroid(country_code: str) -> Optional[Tuple[float, float]]:
    """Get centroid coordinates for a country"""
    if country_code in COUNTRY_CENTROIDS:
        coords = COUNTRY_CENTROIDS[country_code]
        return coords['lat'], coords['lon']
    return None

def calculate_confidence_score(result: GeolocationResult, message: Dict) -> float:
    """Calculate confidence score based on various factors"""
    base_confidence = result.confidence
    
    # Boost confidence for certain sources
    if result.source.startswith('coordinates_regex'):
        base_confidence *= 1.2  # Exact coordinates are very reliable
    elif result.source.startswith('flag_emoji'):
        base_confidence *= 0.9  # Country-level is good but not precise
    elif result.source.startswith('openai_llm'):
        base_confidence *= 1.1  # LLM extraction is generally reliable
    
    # Consider message length and content
    text = message.get('text', '')
    if len(text) > 100:
        base_confidence *= 1.05  # Longer messages might have more context
    
    # Consider channel reliability (you could add channel-specific weights here)
    source_channel = message.get('source_channel', '')
    if 'military' in source_channel.lower() or 'conflict' in source_channel.lower():
        base_confidence *= 1.1  # Military/conflict channels might be more precise
    
    return min(base_confidence, 1.0)  # Cap at 1.0

def process_message_with_llm(message: Dict) -> ProcessingResult:
    """Process a single message with LLM geolocation"""
    start_time = time.time()
    
    text = message.get('text', '')
    if not text:
        return ProcessingResult(message, [], time.time() - start_time)
    
    # Try existing methods first (coordinates, flags)
    results = []
    
    # 1. Extract coordinates
    coords = extract_coordinates(text)
    if coords:
        lat, lon = coords
        result = GeolocationResult(
            lat=lat,
            lon=lon,
            confidence=0.95,
            source="coordinates_regex",
            place_name=f"Coordinates: {lat:.4f}, {lon:.4f}",
            geocoding_attempts=["Extracted coordinates from text"]
        )
        results.append(result)
    
    # 2. Extract flag countries
    flag_countries = extract_flag_countries(text)
    for country_code in flag_countries:
        centroid = get_country_centroid(country_code)
        if centroid:
            lat, lon = centroid
            result = GeolocationResult(
                lat=lat,
                lon=lon,
                country_code=country_code,
                confidence=0.85,
                source="flag_emoji",
                place_name=f"Country: {country_code}",
                geocoding_attempts=[f"Extracted flag emoji for {country_code}"]
            )
            results.append(result)
    
    # 3. Use LLM for location extraction (only if no good results yet)
    if not results or all(r.confidence < 0.8 for r in results):
        try:
            # Use the correct LLM interface
            result_dict = geo_pipeline.invoke(GeoState(text=text))
            llm_results = result_dict.get("results", [])
            results.extend(llm_results)
        except Exception as e:
            logger.error(f"LLM processing failed for message {message.get('id')}: {e}")
    
    # Calculate final confidence scores
    for result in results:
        result.confidence = calculate_confidence_score(result, message)
    
    # Sort by confidence
    results.sort(key=lambda x: x.confidence, reverse=True)
    
    processing_time = time.time() - start_time
    return ProcessingResult(message, results, processing_time)

def process_file_with_llm(input_file: str, output_file: str):
    """Process a JSONL file with LLM geolocation"""
    logger.info(f"Processing {input_file} with LLM geolocation...")
    
    processed_messages = []
    total_messages = 0
    successful_geolocations = 0
    
    with open(input_file, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            try:
                message = json.loads(line.strip())
                total_messages += 1
                
                # Process message with LLM
                result = process_message_with_llm(message)
                
                # Add best geolocation result to message
                if result.geolocation_results:
                    best_result = result.geolocation_results[0]
                    message['geolocation'] = {
                        'lat': best_result.lat,
                        'lon': best_result.lon,
                        'country_code': best_result.country_code,
                        'confidence': best_result.confidence,
                        'source': best_result.source,
                        'place_name': best_result.place_name,
                        'geocoding_attempts': best_result.geocoding_attempts
                    }
                    successful_geolocations += 1
                else:
                    message['geolocation'] = {
                        'lat': None,
                        'lon': None,
                        'country_code': None,
                        'confidence': 0.0,
                        'source': 'none',
                        'place_name': None,
                        'geocoding_attempts': ['No geolocation found']
                    }
                
                # Add processing metadata
                message['processed_at'] = datetime.now().isoformat()
                message['processing_version'] = 'llm_enhanced_v1'
                message['processing_time'] = result.processing_time
                
                processed_messages.append(message)
                
                # Log progress
                if line_num % 50 == 0:
                    logger.info(f"Processed {line_num} messages, {successful_geolocations} with geolocation")
                
                # Rate limiting for API calls
                if result.processing_time < 0.1:
                    time.sleep(0.1 - result.processing_time)
                
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error on line {line_num}: {e}")
                continue
            except Exception as e:
                logger.error(f"Error processing message on line {line_num}: {e}")
                continue
    
    # Write processed messages
    with open(output_file, 'w', encoding='utf-8') as f:
        for message in processed_messages:
            f.write(json.dumps(message, ensure_ascii=False) + '\n')
    
    logger.info(f"Completed processing {input_file}")
    logger.info(f"Total messages: {total_messages}")
    logger.info(f"Successful geolocations: {successful_geolocations}")
    logger.info(f"Success rate: {successful_geolocations/total_messages*100:.1f}%")
    logger.info(f"Output written to {output_file}")

def main():
    """Main processing function"""
    
    # Load API keys
    openai_api_key = os.getenv('OPENAI_API_KEY')
    mapbox_token = os.getenv('MAPBOX_ACCESS_TOKEN')
    
    if not openai_api_key:
        logger.error("Missing OPENAI_API_KEY environment variable")
        return
    
    if not mapbox_token:
        logger.error("Missing MAPBOX_ACCESS_TOKEN environment variable")
        return
    
    # Process unprocessed files
    unprocessed_files = glob.glob('data/unprocessed/*.jsonl')
    
    if not unprocessed_files:
        logger.info("No unprocessed files found")
        return
    
    logger.info(f"Found {len(unprocessed_files)} unprocessed files")
    
    for input_file in unprocessed_files:
        # Generate output filename
        filename = os.path.basename(input_file)
        output_file = f"data/processed/llm_enhanced_{filename}"
        
        # Process file
        process_file_with_llm(input_file, output_file)
        
        # Move processed file to backup
        backup_file = f"data/backup/{filename}"
        os.makedirs('data/backup', exist_ok=True)
        os.rename(input_file, backup_file)
        logger.info(f"Moved {input_file} to {backup_file}")

if __name__ == "__main__":
    main() 