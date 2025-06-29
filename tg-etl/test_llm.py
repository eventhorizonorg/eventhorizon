#!/usr/bin/env python3
"""
Test script for LLM geolocator
"""

import os
import json
from dotenv import load_dotenv
from llm_geolocator import geo_pipeline, GeoState

# Load environment variables
load_dotenv()

def test_llm_geolocator():
    """Test the LLM geolocator with sample Telegram messages"""
    
    # Load API keys
    openai_api_key = os.getenv('OPENAI_API_KEY')
    mapbox_token = os.getenv('MAPBOX_ACCESS_TOKEN')
    
    if not openai_api_key:
        print("❌ Missing OPENAI_API_KEY environment variable")
        return
    
    if not mapbox_token:
        print("❌ Missing MAPBOX_ACCESS_TOKEN environment variable")
        return
    
    print("✅ API keys loaded successfully")
    
    # Test cases based on your example
    test_cases = [
        "Washington deploys bombers to Fordow nuclear facility in Iran",
        "Russian forces advance on Kyiv, Ukraine",
        "Israeli airstrike hits Gaza City",
        "US military base in Ramstein, Germany",
        "Iranian missile strikes Tel Aviv",
        "Ukrainian troops liberate Kherson",
        "No locations mentioned in this message about general news",
        "🚨 Breaking: Explosion reported in Damascus, Syria",
        "Russian troops withdraw from Kharkiv region",
        "US sends military aid to Taiwan"
    ]
    
    print(f"\n🧪 Testing {len(test_cases)} sample messages...\n")
    
    for i, text in enumerate(test_cases, 1):
        print(f"--- Test {i}: {text} ---")
        
        try:
            # Use the graph pipeline
            result_dict = geo_pipeline.invoke(GeoState(text=text))
            results = result_dict.get("results", [])
            
            if results:
                for j, result in enumerate(results, 1):
                    print(f"  Result {j}:")
                    print(f"    📍 Location: {result.place_name}")
                    print(f"    🗺️  Coordinates: {result.lat:.4f}, {result.lon:.4f}")
                    print(f"    🎯 Confidence: {result.confidence:.2f}")
                    print(f"    🔧 Source: {result.source}")
                    print(f"    📝 Attempts: {result.geocoding_attempts}")
                    print()
            else:
                print("  ❌ No locations found")
                print()
                
        except Exception as e:
            print(f"  ❌ Error: {e}")
            print()

if __name__ == "__main__":
    test_llm_geolocator() 