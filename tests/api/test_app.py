import pytest
import json
from app import app

@pytest.fixture
def client():
    """Create a test client for the Flask app"""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_index_route(client):
    """Test the main index route"""
    response = client.get('/')
    assert response.status_code == 200
    assert b'<!DOCTYPE html>' in response.data

def test_mapbox_token_route(client, monkeypatch):
    """Test the Mapbox token API endpoint"""
    # Mock environment variable
    monkeypatch.setenv('MAPBOX_TOKEN', 'test_token')
    
    response = client.get('/api/mapbox-token')
    data = json.loads(response.data)
    
    assert response.status_code == 200
    assert 'token' in data
    assert data['token'] == 'test_token'

def test_mapbox_token_missing(client, monkeypatch):
    """Test Mapbox token endpoint when token is missing"""
    # Remove environment variable
    monkeypatch.delenv('MAPBOX_TOKEN', raising=False)
    
    response = client.get('/api/mapbox-token')
    data = json.loads(response.data)
    
    assert response.status_code == 500
    assert 'error' in data

def test_static_files(client):
    """Test static file serving"""
    response = client.get('/static/script.js')
    assert response.status_code == 200
    assert b'// Mapbox access token' in response.data

def test_favicon(client):
    """Test favicon serving"""
    response = client.get('/favicon.ico')
    assert response.status_code == 200

def test_supabase_test_route(client, monkeypatch):
    """Test Supabase connection endpoint"""
    # Mock environment variables
    monkeypatch.setenv('SUPABASE_URL', 'https://test.supabase.co')
    monkeypatch.setenv('SUPABASE_ANON_KEY', 'test_key')
    
    response = client.get('/api/supabase-test')
    data = json.loads(response.data)
    
    # Should return an error since we're not actually connecting to Supabase
    assert response.status_code == 500
    assert 'error' in data or 'status' in data

def test_messages_route(client, monkeypatch):
    """Test messages API endpoint"""
    # Mock environment variables
    monkeypatch.setenv('SUPABASE_URL', 'https://test.supabase.co')
    monkeypatch.setenv('SUPABASE_ANON_KEY', 'test_key')
    
    response = client.get('/api/messages')
    data = json.loads(response.data)
    
    # Should return an error since we're not actually connecting to Supabase
    assert response.status_code == 500
    assert 'error' in data or 'status' in data

def test_message_by_id_route(client, monkeypatch):
    """Test individual message API endpoint"""
    # Mock environment variables
    monkeypatch.setenv('SUPABASE_URL', 'https://test.supabase.co')
    monkeypatch.setenv('SUPABASE_ANON_KEY', 'test_key')
    
    response = client.get('/api/messages/1')
    data = json.loads(response.data)
    
    # Should return an error since we're not actually connecting to Supabase
    assert response.status_code == 500
    assert 'error' in data or 'status' in data 