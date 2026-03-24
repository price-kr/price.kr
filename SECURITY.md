# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| main branch | Yes |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT open a public GitHub issue.**
2. Use [GitHub Security Advisories](https://github.com/price-kr/price.kr/security/advisories/new) to report the vulnerability privately.
3. Alternatively, email the maintainer directly.

## What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Response Timeline

- **Acknowledgment:** within 48 hours
- **Initial assessment:** within 7 days
- **Fix or mitigation:** as soon as practical, depending on severity

## Scope

In scope:
- Cloudflare Workers redirect engine (`workers/`)
- GitHub Actions workflows (`.github/workflows/`)
- Data validation logic (`scripts/`)
- Web application (`web/`)

Out of scope:
- Cloudflare and Vercel platform vulnerabilities (report to respective vendors)
- Social engineering attacks
- Denial of service via rate limiting (Cloudflare free tier limitations are known)
