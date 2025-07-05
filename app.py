from flask import Flask, render_template, send_from_directory, jsonify
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

@app.route('/')
def index():
    """Serve the main page with the Mapbox globe viewer"""
    return render_template('index.html')

@app.route('/api/mapbox-token')
def get_mapbox_token():
    """Securely provide the Mapbox token to the frontend"""
    token = os.getenv('MAPBOX_TOKEN')
    if not token:
        return jsonify({'error': 'Mapbox token not configured'}), 500
    return jsonify({'token': token})

@app.route('/static/<path:filename>')
def static_files(filename):
    """Serve static files (CSS, JS)"""
    return send_from_directory('static', filename)

@app.route('/favicon.ico')
def favicon():
    """Serve favicon"""
    return send_from_directory('static', 'favicon.ico')

if __name__ == '__main__':
    print("🌍 Starting Mapbox Globe Viewer...")
    print("📍 Server will be available at: http://localhost:8001")
    print("🔄 Press Ctrl+C to stop the server")
    print("-" * 50)
    
    # Run the Flask app
    app.run(
        host='0.0.0.0',  # Allow external connections
        port=8001,        # Use port 8001 since 8000 is in use
        debug=True,       # Enable debug mode for development
        threaded=True     # Enable threading for better performance
    ) 