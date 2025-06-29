#!/usr/bin/env python3
"""
Convert simplified JSONL data to GeoJSON format for web visualization.
"""

import json
import glob
import os
from pathlib import Path

def convert_simplified_to_geojson():
    """Convert all simplified JSONL files to a single GeoJSON file."""
    
    # Find all simplified JSONL files
    processed_dir = Path("data/processed")
    jsonl_files = list(processed_dir.glob("simplified_*.jsonl"))
    
    if not jsonl_files:
        print("No simplified JSONL files found!")
        return
    
    print(f"Found {len(jsonl_files)} simplified JSONL files")
    
    # Collect all features
    all_features = []
    
    for jsonl_file in jsonl_files:
        print(f"Processing {jsonl_file.name}...")
        
        with open(jsonl_file, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                try:
                    data = json.loads(line.strip())
                    
                    # Check if we have geolocation data
                    if 'geolocation' in data and data['geolocation']:
                        geoloc = data['geolocation']
                        
                        # Only include if we have valid coordinates
                        if 'lat' in geoloc and 'lon' in geoloc and geoloc['lat'] and geoloc['lon']:
                            feature = {
                                "type": "Feature",
                                "geometry": {
                                    "type": "Point",
                                    "coordinates": [geoloc['lon'], geoloc['lat']]
                                },
                                "properties": {
                                    "id": data.get('id'),
                                    "date": data.get('date'),
                                    "text": data.get('text', ''),
                                    "telegram_url": data.get('telegram_url', ''),
                                    "media_type": data.get('media_type', ''),
                                    "source_channel": data.get('source_channel', ''),
                                    "geolocation": {
                                        "lat": geoloc['lat'],
                                        "lon": geoloc['lon'],
                                        "confidence": geoloc.get('confidence', 0.5),
                                        "source": geoloc.get('source', 'simplified')
                                    }
                                }
                            }
                            all_features.append(feature)
                
                except json.JSONDecodeError as e:
                    print(f"Error parsing line {line_num} in {jsonl_file.name}: {e}")
                    continue
    
    # Create GeoJSON structure
    geojson = {
        "type": "FeatureCollection",
        "features": all_features
    }
    
    # Save to file
    output_file = "data/geojson/simplified_telegram_data.geojson"
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Conversion complete!")
    print(f"📊 Total features: {len(all_features)}")
    print(f"📁 Output file: {output_file}")
    
    # Show some sample data
    if all_features:
        print(f"\n📍 Sample coordinates:")
        for i, feature in enumerate(all_features[:5]):
            coords = feature['geometry']['coordinates']
            channel = feature['properties']['source_channel']
            print(f"  {channel}: [{coords[1]:.4f}, {coords[0]:.4f}]")

if __name__ == "__main__":
    convert_simplified_to_geojson() 