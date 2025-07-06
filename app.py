from flask import Flask, render_template, send_from_directory, jsonify
import os
from dotenv import load_dotenv
from supabase import create_client, Client
from flask_cors import CORS
import json

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, origins=[
    "https://*.vercel.app",
    "http://localhost:3000",
    "http://localhost:8001"
])

# Initialize Supabase client
def get_supabase_client():
    """Create and return a Supabase client"""
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_ANON_KEY')
    
    if not url or not key:
        return None
    
    try:
        return create_client(url, key)
    except Exception as e:
        print(f"Error creating Supabase client: {e}")
        return None

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

@app.route('/api/supabase-test')
def test_supabase_connection():
    """Test Supabase connection and return basic info"""
    try:
        supabase = get_supabase_client()
        if not supabase:
            return jsonify({
                'status': 'error',
                'message': 'Failed to create Supabase client - check credentials'
            }), 500
        
        # Try to fetch from messages table to confirm connection
        response = supabase.table('messages').select('id, text, date, channel, latitude, longitude, country_code').limit(5).execute()
        
        return jsonify({
            'status': 'success',
            'message': 'Supabase connection successful',
            'sample_messages': response.data,
            'message_count': len(response.data)
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Connection test failed: {str(e)}'
        }), 500

@app.route('/api/tables')
def list_tables():
    """List all available tables in the database"""
    try:
        supabase = get_supabase_client()
        if not supabase:
            return jsonify({'error': 'Supabase client not available'}), 500
        
        # Get all tables using a simpler approach
        response = supabase.rpc('get_tables').execute()
        
        # If the RPC function doesn't exist, try a different approach
        if not response.data:
            # Try to get tables by querying pg_tables
            response = supabase.table('pg_tables').select('tablename, schemaname').execute()
            
            # Filter out system tables and organize by schema
            tables = {}
            for row in response.data:
                schema = row['schemaname']
                table_name = row['tablename']
                
                # Skip system schemas
                if schema not in ['information_schema', 'pg_catalog', 'pg_toast']:
                    if schema not in tables:
                        tables[schema] = []
                    tables[schema].append(table_name)
            
            return jsonify({
                'status': 'success',
                'tables': tables
            })
        
        return jsonify({
            'status': 'success',
            'tables': response.data
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to list tables: {str(e)}'
        }), 500

@app.route('/api/table/<table_name>')
def get_table_info(table_name):
    """Get sample data and structure from a specific table"""
    try:
        supabase = get_supabase_client()
        if not supabase:
            return jsonify({'error': 'Supabase client not available'}), 500
        
        # Get sample data (limit to 10 rows)
        response = supabase.table(table_name).select('*').limit(10).execute()
        
        return jsonify({
            'status': 'success',
            'table_name': table_name,
            'sample_data': response.data,
            'row_count': len(response.data)
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to get table info: {str(e)}'
        }), 500

@app.route('/api/messages')
def get_messages():
    """Get all geolocated messages from the database"""
    try:
        supabase = get_supabase_client()
        if not supabase:
            return jsonify({'error': 'Supabase client not available'}), 500
        
        # Get messages with geolocation data
        response = supabase.table('messages').select(
            'id, text, date, channel, latitude, longitude, country_code'
        ).not_.is_('latitude', 'null').not_.is_('longitude', 'null').execute()
        
        return jsonify({
            'status': 'success',
            'messages': response.data,
            'count': len(response.data)
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to fetch messages: {str(e)}'
        }), 500

@app.route('/api/messages/<int:message_id>')
def get_message(message_id):
    """Get a specific message by ID"""
    try:
        supabase = get_supabase_client()
        if not supabase:
            return jsonify({'error': 'Supabase client not available'}), 500
        
        response = supabase.table('messages').select('*').eq('id', message_id).execute()
        
        if not response.data:
            return jsonify({'error': 'Message not found'}), 404
        
        return jsonify({
            'status': 'success',
            'message': response.data[0]
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to fetch message: {str(e)}'
        }), 500

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
    
    # Test Supabase connection on startup
    print("🔌 Testing Supabase connection...")
    supabase = get_supabase_client()
    if supabase:
        print("✅ Supabase client created successfully")
    else:
        print("❌ Failed to create Supabase client - check your .env file")
    
    # Run the Flask app
    app.run(
        host='0.0.0.0',  # Allow external connections
        port=8001,        # Use port 8001 since 8000 is in use
        debug=True,       # Enable debug mode for development
        threaded=True     # Enable threading for better performance
    ) 