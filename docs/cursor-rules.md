# Cursor Rules

These rules help keep the openconflict project consistent and maintainable, especially for frontend development.

## 📋 Overview

The project uses a comprehensive `.cursor-rules.yaml` file that defines:
- **Code formatting standards** (line length, indentation, etc.)
- **Language-specific configurations** (Python, JavaScript)
- **Testing and linting tools** (pytest, flake8, black, isort)
- **Documentation structure** and file organization
- **CI/CD pipeline** configuration
- **Security and quality standards**

## 🎯 Formatting Standards

- **Max line length:** 100 characters
- **Indentation:** 4 spaces
- **File encoding:** UTF-8
- **Trailing whitespace:** Trimmed
- **Final newline:** Required

## 🐍 Python Development

### Tools
- **Formatter:** Black (line length: 100)
- **Linter:** Flake8 (with E203, W503 ignored)
- **Import sorter:** isort (Black profile)
- **Testing:** pytest

### Standards
- Use type hints where appropriate
- Follow PEP 8 with Black formatting
- Write docstrings for functions and classes
- Use meaningful variable names
- Keep functions small and focused
- Use environment variables for all secrets
- Write tests for new features

### Commands
```bash
# Format code
black .

# Sort imports
isort .

# Lint code
flake8 .

# Run tests
pytest
```

## 🟨 JavaScript Development

### Standards
- Use ES6+ syntax
- Avoid `console.log` in production
- Use meaningful variable names
- Keep functions small and focused
- Use `const`/`let` instead of `var`
- Fetch API keys from backend, never hardcode

### Structure
- All frontend code in `static/` and `templates/`
- Use Mapbox GL JS for mapping functionality
- Keep JavaScript modular and well-organized
- Use semantic HTML in templates

## 📚 Documentation

### Standards
- Keep documentation up to date
- Use clear and concise language
- Include code examples where helpful
- Update docs when making significant changes
- Use emojis for better readability

### Structure
- All documentation in `docs/`
- Main README points to specific guides
- Contributing guide in `docs/contributing.md`
- CI/CD details in `docs/ci_cd.md`
- Frontend guide in `docs/frontend.md`

## 🧪 Testing

### Standards
- Write tests for new features
- Maintain good test coverage
- Use descriptive test names
- Test both success and failure cases
- Mock external dependencies

### Structure
- All tests in `tests/` directory
- API tests in `tests/api/`
- Integration tests in `tests/integration/`
- Use pytest configuration in `pytest.ini`

## 🔒 Security

### Standards
- Never commit secrets or API keys
- Use environment variables for all sensitive data
- Validate all user inputs
- Keep dependencies updated
- Run security scans regularly

### Environment Variables
- `MAPBOX_TOKEN` - Mapbox access token
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `BACKEND_URL` - Backend API URL (for Vercel)

## 🚀 Deployment

### Frontend (Vercel)
- Static files served from `static/` and `templates/`
- Environment variables set in Vercel dashboard
- API requests proxied to backend via `vercel.json`

### Backend
- Flask application in `app.py`
- Can deploy to any platform (Heroku, Railway, etc.)
- Environment variables set in deployment platform

### CI/CD
- GitHub Actions workflows in `.github/workflows/`
- Runs on all pushes to `main` branch
- Tests, linting, and security scans
- Automatic deployment checks

## 📁 File Organization

```
openconflict/
├── 📁 docs/           # Documentation
├── 📁 tests/          # Test suite
├── 📁 static/         # Frontend assets
├── 📁 templates/      # HTML templates
├── 📁 .github/        # CI/CD workflows
├── 🐍 app.py          # Flask application
├── 🚀 run.py          # Development server
├── 📋 requirements.txt # Python dependencies
├── ⚙️ vercel.json     # Vercel configuration
├── 📖 README.md       # Project overview
└── 📋 .cursor-rules.yaml # Cursor rules (this file)
```

## 🔧 Configuration Files

- `.cursor-rules.yaml` - Cursor rules (this file)
- `requirements.txt` - Python dependencies
- `pytest.ini` - Test configuration
- `vercel.json` - Vercel deployment config
- `.env.example` - Environment variables template

## 📖 See Also

- [Main README](../README.md) - Project overview and quickstart
- [Contributing Guide](contributing.md) - How to contribute
- [Frontend Guide](frontend.md) - Frontend development details
- [CI/CD Guide](ci_cd.md) - Pipeline and deployment details 