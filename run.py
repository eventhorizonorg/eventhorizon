#!/usr/bin/env python3
"""
Mapbox Globe - Minimal Flask App Startup Script
"""

import sys
import os
from app import app

def main():
    """Start the Flask application with clear instructions"""
    
    print("🌍 Mapbox Globe - Minimal App")
    print("=" * 40)
    print("📍 Server will be available at: http://localhost:8001")
    print("🔄 Press Ctrl+C to stop the server")
    print("=" * 40)
    
    try:
        # Run the Flask app
        app.run(
            host='0.0.0.0',
            port=8001,
            debug=True,
            threaded=True
        )
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main() 