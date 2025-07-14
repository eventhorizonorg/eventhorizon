# 📚 Documentation

Welcome to the SpectrumAtlas project documentation. This directory contains all project documentation organized for clarity and maintainability.

## 📖 Contents

### 🚀 Getting Started
- **[Frontend Development](frontend.md)** - Guide for frontend development with Vercel
- **[CI/CD Pipeline](ci_cd.md)** - Continuous integration and deployment details
- **[Deployment Guide](deployment.md)** - Complete deployment instructions

### 👥 Contributing
- **[Contributing Guide](contributing.md)** - How to contribute to the project
- **[Cursor Rules](cursor-rules.md)** - Development standards and formatting rules

### 🔗 Quick Links
- [Main README](../README.md) - Project overview and quickstart
- [GitHub Workflows](../.github/workflows/) - CI/CD pipeline definitions

## 🏗️ Project Architecture

```
spectrumatlas-webapp/
├── 📁 docs/           # Documentation (this directory)
├── 📁 app/            # Next.js App Router
│   ├── 📄 page.tsx    # Main globe component
│   ├── 📄 layout.tsx  # Root layout
│   └── 📁 api/        # API routes
├── 📁 .github/        # CI/CD workflows
├── ⚙️ next.config.js  # Next.js configuration
├── 📋 package.json    # Node.js dependencies
└── 📖 README.md       # Project overview
```

## 🎯 Development Workflow

1. **Local Development**: See [Frontend Guide](frontend.md)
2. **Testing**: Run `npm test` from project root
3. **CI/CD**: Automatic on push to main branch
4. **Deployment**: Vercel for full-stack deployment

## 📝 Documentation Standards

- Keep docs concise and focused
- Use clear headings and structure
- Include code examples where helpful
- Update docs when making significant changes 