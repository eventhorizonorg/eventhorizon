# 🌍 SpectrumAtlas

A globe-based visualization app using Mapbox, Supabase, and Flask, with a static frontend deployed on Vercel.

[![CI/CD](https://github.com/danielsunyuan/spectrumatlas-webapp/workflows/Backend%20API%20Tests/badge.svg)](https://github.com/danielsunyuan/spectrumatlas-webapp/actions)
[![Security](https://github.com/danielsunyuan/spectrumatlas-webapp/workflows/Security%20Scan/badge.svg)](https://github.com/danielsunyuan/spectrumatlas-webapp/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Quickstart

### Prerequisites
- Python 3.11+
- Mapbox access token
- Supabase project

### Installation
```bash
# Clone the repository
git clone https://github.com/danielsunyuan/spectrumatlas-webapp.git
cd spectrumatlas-webapp

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp env.example .env
# Edit .env with your actual values

# Run the development server
python run.py
```

### Access the Application
Open [http://localhost:8001](http://localhost:8001) in your browser.

## 🏗️ Architecture

```
spectrumatlas-webapp/
├── 📁 docs/           # Documentation
├── 📁 tests/          # Test suite
├── 📁 static/         # Frontend assets
├── 📁 templates/      # HTML templates
├── 📁 .github/        # CI/CD workflows
├── 🐍 app.py          # Flask application
├── 🚀 run.py          # Development server
├── 📋 requirements.txt # Python dependencies
├── ⚙️ vercel.json     # Vercel configuration
└── 📖 README.md       # Project overview
```

## 🛠️ Tech Stack

- **Frontend**: HTML, JavaScript, Mapbox GL JS
- **Backend**: Flask (Python)
- **Database**: Supabase
- **Deployment**: Vercel (frontend)
- **CI/CD**: GitHub Actions

## 📚 Documentation

- [Frontend Development](docs/frontend.md)
- [CI/CD Pipeline](docs/ci_cd.md)
- [Contributing Guide](docs/contributing.md)
- [Cursor Rules](docs/cursor-rules.md)

## 🤝 Contributing

See [CONTRIBUTING.md](docs/contributing.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Mapbox](https://www.mapbox.com/) for mapping capabilities
- [Supabase](https://supabase.com/) for database and backend services
- [Vercel](https://vercel.com/) for frontend hosting 