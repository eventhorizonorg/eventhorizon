# 🌍 openconflict

A globe-based visualization app using Mapbox, Supabase, and Flask, with a static frontend deployed on Vercel.

[![CI/CD](https://github.com/yourusername/openconflict/workflows/Backend%20API%20Tests/badge.svg)](https://github.com/yourusername/openconflict/actions)
[![Security](https://github.com/yourusername/openconflict/workflows/Security%20Scan/badge.svg)](https://github.com/yourusername/openconflict/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Quickstart

### Prerequisites
- Python 3.11+
- Mapbox access token
- Supabase project

### Installation
```bash
# Clone the repository
git clone https://github.com/yourusername/openconflict.git
cd openconflict

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
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vercel        │    │   GitHub        │    │   Flask         │
│   (Frontend)    │◄──►│   Actions       │◄──►│   (Backend)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mapbox        │    │   Supabase      │    │   Environment   │
│   (Maps)        │    │   (Database)    │    │   Variables     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📚 Documentation

- **[📖 Project Docs](docs/README.md)** - Complete documentation
- **[🌐 Frontend Guide](docs/frontend.md)** - Frontend development with Vercel
- **[🔄 CI/CD Pipeline](docs/ci_cd.md)** - Continuous integration details
- **[👥 Contributing](docs/contributing.md)** - How to contribute
- **[📝 Cursor Rules](docs/cursor-rules.md)** - Development standards

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | HTML/JS (MapboxGL), Vercel |
| **Backend** | Flask (Python), Supabase |
| **CI/CD** | GitHub Actions |
| **Maps** | Mapbox GL JS |
| **Database** | Supabase (PostgreSQL) |

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test categories
pytest tests/api/          # API tests
pytest tests/integration/  # Integration tests
```

## 🚀 Deployment

- **Frontend**: Automatic deployment to Vercel on push to `main`
- **Backend**: Deploy to your preferred platform (Heroku, Railway, etc.)
- **Environment Variables**: Set in Vercel dashboard and backend platform

## 🤝 Contributing

See [docs/contributing.md](docs/contributing.md) for contribution guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Mapbox](https://www.mapbox.com/) for mapping capabilities
- [Supabase](https://supabase.com/) for database and backend services
- [Vercel](https://vercel.com/) for frontend hosting 