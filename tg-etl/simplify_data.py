#!/usr/bin/env python3
"""
Simplify processed Telegram data to essential fields only.
Keeps: link, date, text/content, media links, and geolocation.
"""

import json
import os
import glob
from datetime import datetime
from pathlib import Path

def extract_media_url(raw_message_str):
    """Extract media URL from raw message if available."""
    try:
        # Look for media URLs in the raw message string
        if 'media=' in raw_message_str and 'media=None' not in raw_message_str:
            # This is a simplified extraction - in practice you might want more sophisticated parsing
            if 'MessageMediaPhoto' in raw_message_str:
                return "photo"
            elif 'MessageMediaDocument' in raw_message_str:
                return "document"
            elif 'MessageMediaWebPage' in raw_message_str:
                return "webpage"
        return None
    except:
        return None

def simplify_message(message_data):
    """Simplify a single message to essential fields only."""
    simplified = {
        "id": message_data.get("id"),
        "date": message_data.get("date"),
        "text": message_data.get("text"),
        "telegram_url": message_data.get("telegram_url"),
        "media_type": message_data.get("media_type"),
        "geolocation": message_data.get("geolocation")
    }
    
    # Clean up geolocation if it exists
    if simplified["geolocation"]:
        # Keep only essential geolocation fields
        geo = simplified["geolocation"]
        simplified["geolocation"] = {
            "lat": geo.get("lat"),
            "lon": geo.get("lon"),
            "confidence": geo.get("confidence"),
            "source": geo.get("source"),
            "place_name": geo.get("place_name")
        }
    
    return simplified

def process_file(input_file, output_file):
    """Process a single JSONL file and write simplified output."""
    print(f"Processing: {input_file}")
    
    processed_count = 0
    with open(input_file, 'r', encoding='utf-8') as infile, \
         open(output_file, 'w', encoding='utf-8') as outfile:
        
        for line_num, line in enumerate(infile, 1):
            try:
                # Parse JSON line
                message_data = json.loads(line.strip())
                
                # Simplify the message
                simplified = simplify_message(message_data)
                
                # Write simplified message
                outfile.write(json.dumps(simplified, ensure_ascii=False) + '\n')
                processed_count += 1
                
                # Progress indicator
                if processed_count % 100 == 0:
                    print(f"  Processed {processed_count} messages...")
                    
            except json.JSONDecodeError as e:
                print(f"  Error parsing line {line_num}: {e}")
                continue
            except Exception as e:
                print(f"  Error processing line {line_num}: {e}")
                continue
    
    print(f"  Completed: {processed_count} messages written to {output_file}")
    return processed_count

def main():
    """Main function to process all files in the processed directory."""
    # Setup paths
    processed_dir = Path("data/processed")
    simplified_dir = Path("data/simplified")
    
    # Create simplified directory if it doesn't exist
    simplified_dir.mkdir(exist_ok=True)
    
    # Find all JSONL files in processed directory
    jsonl_files = list(processed_dir.glob("*.jsonl"))
    
    if not jsonl_files:
        print("No JSONL files found in data/processed/")
        return
    
    print(f"Found {len(jsonl_files)} files to process:")
    for file in jsonl_files:
        print(f"  - {file.name}")
    
    total_processed = 0
    
    # Process each file
    for input_file in jsonl_files:
        # Create output filename
        output_file = simplified_dir / f"simplified_{input_file.name}"
        
        # Process the file
        count = process_file(input_file, output_file)
        total_processed += count
    
    print(f"\n✅ Processing complete!")
    print(f"Total messages processed: {total_processed}")
    print(f"Simplified files saved to: {simplified_dir}")
    
    # Show file sizes for comparison
    print("\n📊 File size comparison:")
    for input_file in jsonl_files:
        output_file = simplified_dir / f"simplified_{input_file.name}"
        if output_file.exists():
            input_size = input_file.stat().st_size / 1024 / 1024  # MB
            output_size = output_file.stat().st_size / 1024 / 1024  # MB
            reduction = ((input_size - output_size) / input_size) * 100
            print(f"  {input_file.name}: {input_size:.1f}MB → {output_size:.1f}MB ({reduction:.1f}% reduction)")

if __name__ == "__main__":
    main() 