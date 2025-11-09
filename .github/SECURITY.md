# Security Policy

## Supported Versions

We actively support security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < Latest| :x:                |

## Security Workflows

This repository uses automated security scanning to protect against:

### 1. Secret Scanning
- **Gitleaks**: Scans for hardcoded secrets, API keys, and credentials
- **TruffleHog**: Additional layer of secret detection
- Runs on every push, PR, and daily via schedule

### 2. Dependency Scanning
- **npm audit**: Checks for known vulnerabilities in dependencies
- **Dependabot**: Automated dependency updates with security focus
- Weekly scans for new vulnerabilities

### 3. Code Security Analysis
- **CodeQL**: Static analysis for security vulnerabilities
- **Environment Variable Checks**: Ensures secrets are not hardcoded
- Validates proper use of environment variables

## Reporting a Vulnerability

If you discover a security vulnerability, please **DO NOT** open a public issue.

Instead, please email: **danielsunyuan@gmail.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

We will respond within 48 hours and work with you to address the issue.

## Security Best Practices

### For Developers

1. **Never commit secrets**: Use environment variables or GitHub Secrets
2. **Review PRs carefully**: Check for accidental secret exposure
3. **Keep dependencies updated**: Run `npm audit` regularly
4. **Use secure defaults**: Follow security guidelines in code reviews

### Environment Variables

All sensitive data must be stored in environment variables:
- `.env.local` for local development (gitignored)
- GitHub Secrets for CI/CD
- Vercel Environment Variables for production

**Never commit:**
- API keys (Stripe, Mapbox, Supabase)
- Secret keys
- Passwords
- Session tokens
- Database credentials

## Security Checklist

Before merging PRs:
- [ ] No hardcoded secrets
- [ ] Environment variables used correctly
- [ ] Dependencies are up to date
- [ ] Security scans pass
- [ ] Code review completed

## Automated Security

All security workflows run automatically:
- On every push to main/develop/stripe branches
- On every pull request
- Daily/weekly scheduled scans
- Manual trigger via workflow_dispatch

Workflow results are visible in the Actions tab.

