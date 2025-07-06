# Frontend Development Guide

This project uses a static frontend (HTML/JS/CSS) served via Vercel, with a Flask backend for API endpoints.

## Structure
- `static/` — JavaScript and static assets
- `templates/` — HTML templates (Jinja2, but mostly static)
- `vercel.json` — Vercel configuration for rewrites and static serving

## Local Development
1. Start the Flask backend:
   ```bash
   python run.py
   ```
2. Open `http://localhost:8001` to view the app.

## Vercel Deployment
- The frontend is deployed automatically on push to `main`.
- Environment variables (like `MAPBOX_TOKEN`, `BACKEND_URL`) are set in the Vercel dashboard.
- API requests from the frontend are proxied to the backend using rewrites in `vercel.json`.

## JavaScript Guidelines
- Use ES6+ syntax.
- Keep all frontend logic in `static/script.js`.
- Avoid hardcoding secrets or API keys in JS; always fetch from backend endpoints.
- Use `console.log` only for debugging; remove before committing.

## HTML Guidelines
- Use semantic HTML in `templates/index.html`.
- Reference JS via `<script src="/static/script.js"></script>`.
- Keep styles minimal and inlined or in a separate CSS file if needed.

## Testing
- JS syntax is checked in CI with `node -c`.
- HTML is validated in CI using BeautifulSoup.

## Cursor Rules
- See [Cursor Rules](cursor-rules.md) for formatting and linting standards. 