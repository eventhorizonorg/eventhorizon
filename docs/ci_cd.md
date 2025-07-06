# CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment, and Vercel for frontend hosting.

## Workflows
- **Frontend Quality Check**: Lints and validates frontend code on changes.
- **Backend API Tests**: Runs tests and linting for the Flask backend.
- **Security Scan**: Checks for vulnerabilities and hardcoded secrets.
- **Integration Tests**: Ensures frontend-backend integration and external API health.
- **Vercel Deployment Check**: Validates Vercel config and static assets.

## Environment Variables
- Set secrets in GitHub for CI: `MAPBOX_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, etc.
- Set environment variables in Vercel dashboard for frontend.

## Local CI Testing
- See the root `README.md` for how to run all checks locally.
- You can also use [`act`](https://github.com/nektos/act) to run GitHub Actions locally.

## More Info
- See `.github/workflows/` for workflow YAMLs.
- See [Cursor Rules](cursor-rules.md) for enforced standards. 