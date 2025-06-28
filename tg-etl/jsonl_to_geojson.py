#!/usr/bin/env python3
"""
Convert processed JSONL files to GeoJSON format for Mapbox visualization
"""

import json
import glob
import os
from datetime import datetime
from typing import Dict, List, Optional

def jsonl_to_geojson(input_file: str, output_file: str) -> tuple[int, int]:
    """Convert a single JSONL file to GeoJSON format"""
    features = []
    total_count = 0
    geolocated_count = 0
    
    with open(input_file, 'r', encoding='utf-8') as infile:
        for line in infile:
            try:
                message = json.loads(line.strip())
                total_count += 1
                
                # Check if message has geolocation data
                geolocation = message.get('geolocation', {})
                lat = geolocation.get('lat')
                lon = geolocation.get('lon')
                
                if lat is not None and lon is not None:
                    # Create GeoJSON feature
                    feature = {
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": [lon, lat]  # GeoJSON uses [lon, lat] order
                        },
                        "properties": {
                            "id": message.get('id'),
                            "date": message.get('date'),
                            "text": message.get('text', '')[:300],  # Truncate long text
                            "telegram_url": message.get('telegram_url'),
                            "sender_id": message.get('sender_id'),
                            "media_type": message.get('media_type'),
                            "views": message.get('views'),
                            "forwards": message.get('forwards'),
                            "source_channel": message.get('source', {}).get('title'),
                            "source_username": message.get('source', {}).get('username'),
                            "geolocation": {
                                "confidence": geolocation.get('confidence', 0.0),
                                "source": geolocation.get('source', 'none'),
                                "place_name": geolocation.get('place_name'),
                                "country_code": geolocation.get('country_code'),
                                "geocoding_attempts": geolocation.get('geocoding_attempts', [])
                            },
                            "processed_at": message.get('processed_at'),
                            "processing_version": message.get('processing_version')
                        }
                    }
                    
                    features.append(feature)
                    geolocated_count += 1
                    
            except json.JSONDecodeError as e:
                print(f"Error parsing JSON: {e}")
                continue
            except Exception as e:
                print(f"Error processing message: {e}")
                continue
    
    # Create GeoJSON collection
    geojson = {
        "type": "FeatureCollection",
        "features": features,
        "properties": {
            "processed_at": datetime.utcnow().isoformat(),
            "source_file": input_file,
            "total_messages": total_count,
            "geolocated_messages": geolocated_count,
            "geolocation_rate": f"{geolocated_count/total_count*100:.1f}%" if total_count > 0 else "0%"
        }
    }
    
    # Write GeoJSON file
    with open(output_file, 'w', encoding='utf-8') as outfile:
        json.dump(geojson, outfile, ensure_ascii=False, indent=2)
    
    print(f"✅ Converted {input_file}")
    print(f"   Total messages: {total_count}")
    print(f"   Geolocated: {geolocated_count} ({geolocated_count/total_count*100:.1f}%)")
    print(f"   Output: {output_file}")
    
    return total_count, geolocated_count

def main():
    """Convert all processed JSONL files to GeoJSON"""
    input_dir = "data/processed"
    output_dir = "data/geojson"
    
    # Create output directory
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Find all enhanced JSONL files
    input_files = glob.glob(os.path.join(input_dir, "enhanced_*.jsonl"))
    
    if not input_files:
        print("❌ No enhanced JSONL files found in data/processed/")
        return
    
    print(f"🔄 Converting {len(input_files)} files to GeoJSON...")
    print("=" * 60)
    
    total_processed = 0
    total_geolocated = 0
    all_features = []
    
    for input_file in input_files:
        filename = os.path.basename(input_file)
        output_file = os.path.join(output_dir, f"{filename.replace('enhanced_', '').replace('.jsonl', '.geojson')}")
        
        processed, geolocated = jsonl_to_geojson(input_file, output_file)
        total_processed += processed
        total_geolocated += geolocated
        
        # Collect features for combined file
        with open(output_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            all_features.extend(data.get('features', []))
    
    # Create combined GeoJSON file
    combined_file = os.path.join(output_dir, "combined_telegram_data.geojson")
    combined_geojson = {
        "type": "FeatureCollection",
        "features": all_features,
        "properties": {
            "processed_at": datetime.utcnow().isoformat(),
            "total_messages": total_processed,
            "geolocated_messages": total_geolocated,
            "geolocation_rate": f"{total_geolocated/total_processed*100:.1f}%" if total_processed > 0 else "0%",
            "source_files": [os.path.basename(f) for f in input_files]
        }
    }
    
    with open(combined_file, 'w', encoding='utf-8') as f:
        json.dump(combined_geojson, f, ensure_ascii=False, indent=2)
    
    print("=" * 60)
    print(f"🎉 Conversion complete!")
    print(f"📊 Total: {total_processed} messages, {total_geolocated} geolocated ({total_geolocated/total_processed*100:.1f}%)")
    print(f"🗺️  Combined GeoJSON: {combined_file}")
    print(f"📁 Individual files: {output_dir}/")
    print()
    print("🚀 Next steps:")
    print("   1. Copy combined_telegram_data.geojson to your web app")
    print("   2. Load it in Mapbox as a GeoJSON source")
    print("   3. Style the points based on confidence or source")

if __name__ == "__main__":
    main() 