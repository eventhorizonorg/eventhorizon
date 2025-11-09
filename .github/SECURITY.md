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
- **Pre-commit hooks**: Local validation before commits
- **GitHub Push Protection**: Enabled via Advanced Security (if available)
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
5. **Run pre-commit hooks**: Install Gitleaks locally to catch secrets before committing

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

### License Policy

**Allowed Licenses:**
- MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, MPL-2.0, LGPL-3.0-or-later

**Denied Licenses:**
- GPL-2.0-only, GPL-3.0-only, AGPL-3.0-only (copyleft licenses)

## Security Checklist

Before merging PRs:
- [ ] No hardcoded secrets
- [ ] Environment variables used correctly
- [ ] Dependencies are up to date
- [ ] Security scans pass
- [ ] Code review completed
- [ ] No high-severity vulnerabilities
- [ ] No denied licenses in dependencies

## Automated Security

All security workflows run automatically:
- On every push to main/develop/stripe branches
- On every pull request
- Daily/weekly scheduled scans
- Manual trigger via workflow_dispatch

Workflow results are visible in the Actions tab and Security tab (for SARIF reports).

All checks must pass before merging to protected branches.

## Local Setup

### Pre-commit Hook

Install Gitleaks locally to catch secrets before committing:

```bash
# macOS
brew install gitleaks

# Or download from: https://github.com/gitleaks/gitleaks/releases
```

The pre-commit hook will automatically run Gitleaks on staged files.

<!-- ci: trigger security workflows -->
