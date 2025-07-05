# 🌍 Mapbox Globe Viewer - Flask App

A beautiful, interactive 3D globe webapp built with Flask and Mapbox GL JS that allows you to explore the world in a stunning 3D environment.

## Features

- **3D Globe Projection**: View the world as a realistic 3D globe
- **Dark Space Theme**: Black space background with stars and grey Earth
- **Interactive Controls**: 
  - Drag to rotate the globe
  - Scroll to zoom in/out
  - Right-click to tilt the view
- **Minimal Design**: Clean, minimal interface with no extra UI elements
- **Flask Backend**: Served via Flask web framework

## Quick Start

### Prerequisites
- Python 3.7 or higher
- pip (Python package installer)
- Mapbox access token

### Installation & Running

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up your Mapbox token**:
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit .env and add your Mapbox token
   # Get your token from: https://account.mapbox.com/access-tokens/
   ```

3. **Run the Flask app**:
   ```bash
   python app.py
   ```

4. **Open your browser** and go to:
   ```
   http://localhost:8001
   ```

The server will start automatically and display the URL in the terminal.

## Environment Configuration

### Mapbox Token Setup

1. **Get a Mapbox token**:
   - Go to [Mapbox Account](https://account.mapbox.com/access-tokens/)
   - Create a new token or use an existing one

2. **Configure the token**:
   ```bash
   # Copy the example file
   cp env.example .env
   
   # Edit .env and replace with your token
   MAPBOX_TOKEN=your_actual_token_here
   ```

### Security Notes

- The `.env` file is automatically ignored by git
- Never commit your actual Mapbox token to version control
- The token is securely passed to the frontend via API

## Controls

### Mouse Controls
- **Left-click and drag**: Rotate the globe
- **Scroll wheel**: Zoom in/out
- **Right-click and drag**: Tilt the view

## Technical Details

- **Backend**: Flask web framework
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Mapbox Token**: Securely stored in environment variables
- **Projection**: Globe projection for authentic 3D experience
- **Style**: Dark-v11 style for grey Earth appearance
- **Atmosphere**: Black space with minimal stars

## Files Structure

```
├── app.py                 # Flask application
├── requirements.txt       # Python dependencies
├── env.example           # Example environment configuration
├── .env                  # Your actual environment file (not in git)
├── README.md             # This file
├── templates/
│   └── index.html        # Main HTML template
└── static/
    ├── script.js         # JavaScript functionality and map controls
    └── favicon.ico       # Website favicon
```

## Development

### Running in Development Mode
The Flask app runs with debug mode enabled by default, which provides:
- Automatic reloading when files change
- Detailed error messages
- Development server features

### Customization

You can easily customize the webapp by:

1. **Changing the map style**: Modify the `style` parameter in `static/script.js`
2. **Adjusting atmosphere effects**: Modify the `setFog()` parameters
3. **Adding new routes**: Extend `app.py` with additional Flask routes

### Production Deployment

For production deployment, consider:
- Using a production WSGI server like Gunicorn
- Setting `debug=False` in `app.py`
- Using environment variables for configuration
- Using a reverse proxy like Nginx

## Browser Compatibility

This webapp works best in modern browsers that support:
- WebGL
- ES6 JavaScript features
- CSS Grid and Flexbox

Recommended browsers:
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Troubleshooting

### Common Issues

1. **Port already in use**: Change the port in `app.py` or kill the process using port 8001
2. **Mapbox token issues**: Ensure your Mapbox token is valid and has the necessary permissions
3. **Environment not loading**: Make sure you have a `.env` file with your `MAPBOX_TOKEN`

### Debug Mode

The app runs in debug mode by default. To disable it for production:
```python
app.run(host='0.0.0.0', port=8001, debug=False)
```

## License

This project uses Mapbox GL JS which is subject to Mapbox's terms of service. The custom code is provided as-is for educational and demonstration purposes.

## Credits

- **Flask**: Web framework for serving the application
- **Mapbox GL JS**: For the 3D mapping capabilities
- **Mapbox Dark Style**: For the grey Earth appearance
- **Custom Styling**: Minimal, clean design with space background 