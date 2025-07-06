# 🌍 SpectrumAtlas

A globe-based visualization app using Mapbox, Supabase, and Next.js, deployed on Vercel.

[![CI/CD](https://github.com/danielsunyuan/spectrumatlas-webapp/workflows/Next.js%20Application%20Tests/badge.svg)](https://github.com/danielsunyuan/spectrumatlas-webapp/actions)
[![Security](https://github.com/danielsunyuan/spectrumatlas-webapp/workflows/Security%20Scan/badge.svg)](https://github.com/danielsunyuan/spectrumatlas-webapp/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Quickstart

### Prerequisites
- Node.js 18+
- Mapbox access token
- Supabase project

### Installation
```bash
# Clone the repository
git clone https://github.com/danielsunyuan/spectrumatlas-webapp.git
cd spectrumatlas-webapp

# Install dependencies
npm install

# Set up environment variables
cp env.example .env.local
# Edit .env.local with your actual values

# Run the development server
npm run dev
```

### Access the Application
Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Architecture

```
spectrumatlas-webapp/
├── 📁 docs/           # Documentation
├── 📁 app/            # Next.js App Router
│   ├── 📄 page.tsx    # Main globe component
│   ├── 📄 layout.tsx  # Root layout
│   └── 📁 api/        # API routes
├── 📁 .github/        # CI/CD workflows
├── ⚙️ next.config.js  # Next.js configuration
├── 📋 package.json    # Node.js dependencies
└── 📖 README.md       # Project overview
```

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase
- **Deployment**: Vercel (Full Stack)
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