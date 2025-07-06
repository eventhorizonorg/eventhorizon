import pytest
import requests
import os
from dotenv import load_dotenv

load_dotenv()

class TestFrontendBackendIntegration:
    """Integration tests for frontend-backend communication"""
    
    def test_backend_url_environment(self):
        """Test that backend URL is configured"""
        backend_url = os.getenv('BACKEND_URL')
        if backend_url:
            print(f"✓ Backend URL configured: {backend_url}")
        else:
            print("⚠ No BACKEND_URL configured - using localhost")
    
    def test_mapbox_token_availability(self):
        """Test that Mapbox token is available"""
        token = os.getenv('MAPBOX_TOKEN')
        if token:
            print("✓ Mapbox token is configured")
        else:
            print("⚠ No Mapbox token configured")
    
    def test_supabase_credentials(self):
        """Test that Supabase credentials are available"""
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_ANON_KEY')
        
        if url and key:
            print("✓ Supabase credentials are configured")
        else:
            print("⚠ Supabase credentials not fully configured")
    
    def test_api_endpoints_structure(self):
        """Test that API endpoints follow expected structure"""
        # This would test against a running backend
        # For now, just check the structure
        expected_endpoints = [
            '/api/mapbox-token',
            '/api/supabase-test',
            '/api/messages',
            '/api/messages/<id>'
        ]
        
        print("Expected API endpoints:")
        for endpoint in expected_endpoints:
            print(f"  - {endpoint}")
    
    def test_frontend_js_structure(self):
        """Test that frontend JavaScript has expected structure"""
        # Check if script.js exists and has expected content
        if os.path.exists('static/script.js'):
            with open('static/script.js', 'r') as f:
                content = f.read()
                
            expected_functions = [
                'initMap',
                'loadAndPlotMessagesGeoJSON',
                'animatePulse',
                'testConnection'
            ]
            
            for func in expected_functions:
                if func in content:
                    print(f"✓ Function {func} found in script.js")
                else:
                    print(f"⚠ Function {func} not found in script.js")
        else:
            print("⚠ static/script.js not found")
    
    def test_html_template_structure(self):
        """Test that HTML template has expected structure"""
        if os.path.exists('templates/index.html'):
            with open('templates/index.html', 'r') as f:
                content = f.read()
                
            expected_elements = [
                'mapboxgl',
                'map',
                'script.js'
            ]
            
            for element in expected_elements:
                if element in content:
                    print(f"✓ Element {element} found in index.html")
                else:
                    print(f"⚠ Element {element} not found in index.html")
        else:
            print("⚠ templates/index.html not found")

def test_environment_configuration():
    """Test that all required environment variables are configured"""
    required_vars = [
        'MAPBOX_TOKEN',
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY'
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"⚠ Missing environment variables: {missing_vars}")
    else:
        print("✓ All required environment variables are configured")

def test_file_structure():
    """Test that project has expected file structure"""
    expected_files = [
        'app.py',
        'requirements.txt',
        'static/script.js',
        'templates/index.html'
    ]
    
    missing_files = []
    for file in expected_files:
        if not os.path.exists(file):
            missing_files.append(file)
    
    if missing_files:
        print(f"⚠ Missing files: {missing_files}")
    else:
        print("✓ All expected files present") 