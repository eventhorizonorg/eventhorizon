# 📚 Documentation

Welcome to the SpectrumAtlas project documentation. This directory contains all project documentation organized for clarity and maintainability.

## 📖 Contents

### 🚀 Getting Started
- **[Frontend Development](frontend.md)** - Guide for frontend development with Vercel
- **[CI/CD Pipeline](ci_cd.md)** - Continuous integration and deployment details

### 👥 Contributing
- **[Contributing Guide](contributing.md)** - How to contribute to the project
- **[Cursor Rules](cursor-rules.md)** - Development standards and formatting rules

### 🔗 Quick Links
- [Main README](../README.md) - Project overview and quickstart
- [GitHub Workflows](../.github/workflows/) - CI/CD pipeline definitions
- [Tests](../tests/) - Test suite and examples

## 🏗️ Project Architecture

```
spectrumatlas-webapp/
├── 📁 docs/           # Documentation (this directory)
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

## 🎯 Development Workflow

1. **Local Development**: See [Frontend Guide](frontend.md)
2. **Testing**: Run `pytest` from project root
3. **CI/CD**: Automatic on push to main branch
4. **Deployment**: Vercel for frontend, separate backend

## 📝 Documentation Standards

- Keep docs concise and focused
- Use clear headings and structure
- Include code examples where helpful
- Update docs when making significant changes 