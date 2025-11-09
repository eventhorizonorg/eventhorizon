# Dependabot Alerts Review

**Date**: 2025-11-09  
**Total Vulnerabilities**: 12 (2 critical, 3 high, 5 moderate, 2 low)

## Critical Vulnerabilities (2)

### 1. Next.js (14.0.4) - Multiple Critical Issues

**Current Version**: `14.0.4`  
**Recommended Version**: `14.2.33` (latest 14.x patch)

**Vulnerabilities**:
- **GHSA-fr5h-rqp8-mj6g**: Server-Side Request Forgery in Server Actions
- **GHSA-gp8f-8m3g-qvj9**: Cache Poisoning
- **GHSA-g77x-44xx-532m**: Denial of Service in image optimization
- **GHSA-7m27-7ghc-44w9**: DoS with Server Actions
- **GHSA-3h52-269p-cp9r**: Information exposure in dev server
- **GHSA-g5qg-72qw-gw5v**: Cache Key Confusion for Image Optimization
- **GHSA-7gfc-8cq8-jh5f**: Authorization bypass vulnerability
- **GHSA-4342-x723-ch2f**: Improper Middleware Redirect Handling (SSRF)
- **GHSA-xv57-4mr9-wg8v**: Content Injection for Image Optimization
- **GHSA-qpjv-v59x-3qc4**: Race Condition to Cache Poisoning
- **GHSA-f82v-jwr5-mffw**: Authorization Bypass in Middleware

**Impact**: High - Multiple attack vectors including SSRF, DoS, and authorization bypass

**Fix**: Upgrade to `next@14.2.33`

### 2. form-data (4.0.0-4.0.3) - Unsafe Random Function

**Current Version**: Transitive dependency (via Next.js)  
**Vulnerability**: **GHSA-fjxv-7rqg-78g4** - Uses unsafe random function for choosing boundary

**Impact**: Medium - Could lead to boundary collision attacks

**Fix**: Will be resolved by upgrading Next.js to 14.2.33 (includes fixed form-data)

## High Vulnerabilities (3)

*Details available in GitHub Security tab*

## Moderate Vulnerabilities (5)

*Details available in GitHub Security tab*

## Low Vulnerabilities (2)

*Details available in GitHub Security tab*

## Recommended Actions

### Immediate (Critical)

1. **Upgrade Next.js**:
   ```bash
   npm install next@14.2.33 eslint-config-next@14.2.33
   ```

2. **Verify compatibility**:
   - Test build: `npm run build`
   - Test dev server: `npm run dev`
   - Run tests: `npm test`

### Short-term (High/Moderate)

1. Review and address high-severity vulnerabilities
2. Update other outdated dependencies (see `npm outdated`)
3. Enable Dependabot auto-merge for security patches

### Long-term

1. Consider upgrading to Next.js 15.x (requires React 19)
2. Set up automated dependency updates via Dependabot
3. Regular security audits

## Dependencies Status

### Outdated Packages

- `@supabase/supabase-js`: 2.50.3 → 2.80.0 (wanted)
- `@testing-library/jest-dom`: 6.6.3 → 6.9.1
- `typescript`: 5.8.3 → 5.9.3
- `tailwindcss`: 3.4.17 → 3.4.18

### Major Version Updates Available

- `next`: 14.0.4 → 16.0.1 (major - requires React 19)
- `react`: 18.3.1 → 19.2.0 (major)
- `mapbox-gl`: 2.15.0 → 3.16.0 (major)

## Security Workflow Status

✅ **Dependency Review**: Configured to block high+ severity  
✅ **NPM Audit**: Running weekly  
✅ **Dependabot**: Configured for weekly security updates  
✅ **CodeQL**: Active for code analysis

## References

- [GitHub Security Tab](https://github.com/eventhorizonorg/eventhorizon/security/dependabot)
- [Next.js Security Advisories](https://github.com/advisories?query=next.js)
- [npm audit report](https://docs.npmjs.com/cli/v10/commands/npm-audit)

