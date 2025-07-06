#!/usr/bin/env python3
"""
SpectrumAtlas Development Server
A globe-based visualization app using Mapbox, Supabase, and Flask.
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def main():
    """Start the development server"""
    print("🌍 SpectrumAtlas - Globe Visualization App")
    print("=" * 40)
    print("📍 Server will be available at: http://localhost:8001")
    print("🔄 Press Ctrl+C to stop the server")
    print("=" * 40)
    
    # Check for required environment variables
    required_vars = ['MAPBOX_TOKEN']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"⚠️  Warning: Missing environment variables: {', '.join(missing_vars)}")
        print("   Create a .env file with these variables for full functionality.")
    
    # Import and run Flask app
    try:
        from app import app
        app.run(host='0.0.0.0', port=8001, debug=True)
    except ImportError as e:
        print(f"❌ Error importing Flask app: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main() 