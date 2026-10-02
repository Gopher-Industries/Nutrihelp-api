# Security Policy

## Overview

NutriHelp API is the backend service for the NutriHelp platform.

The project handles authentication, API requests, user data, file uploads,
external service integrations and other backend operations. Security issues
should be reported responsibly so they can be reviewed and resolved before
public disclosure.

## Supported Version

The current `master` branch is the actively maintained version of the project.

| Version | Supported |
| ------- | --------- |
| master  | Yes       |
| Older branches | No |

## Reporting a Vulnerability

Please do not publicly report security vulnerabilities through GitHub Issues.

If you discover a potential vulnerability, report it privately to the
NutriHelp project maintainers.

When reporting an issue, include as much of the following information as
possible:

- Description of the vulnerability
- Affected endpoint, component or file
- Steps to reproduce the issue
- Expected behaviour
- Actual behaviour
- Potential security impact
- Relevant screenshots or logs
- Suggested remediation, if known

Do not include passwords, API keys, access tokens, JWTs or other sensitive
credentials in reports.

## Security Areas

Security reports may include issues related to:

- Authentication and authorisation
- JWT or session handling
- Input validation
- API endpoint access control
- File upload handling
- Rate limiting
- Sensitive information exposure
- Injection vulnerabilities
- Dependency vulnerabilities
- Secrets and environment configuration
- Error handling
- Security headers and CORS configuration

## Existing Security Measures

The NutriHelp API includes several security controls, including:

- Authentication and authorisation controls
- Input validation and middleware protection
- Rate limiting
- Security headers
- CORS restrictions
- Environment-based secret configuration
- HTTPS/TLS protection
- Security logging and monitoring
- Automated vulnerability scanning

The project also uses automated security tools such as CodeQL and Dependabot
to help identify source-code and dependency-related vulnerabilities.

## Dependency Security

The project uses Node.js and Python dependencies.

Dependencies should be regularly reviewed and updated. Automated tools such
as Dependabot and CodeQL may generate alerts or pull requests when security
issues are identified.

Security-related dependency updates should be tested before they are merged.

## Secrets and Credentials

Sensitive credentials must not be committed directly to the repository.

This includes:

- API keys
- JWT secrets
- Database credentials
- Service tokens
- SMTP credentials
- Authentication tokens

Secrets should be stored using environment variables or approved secret
management mechanisms.

If a credential is accidentally exposed, it should be revoked and replaced
as soon as possible.

## Responsible Security Testing

Security testing should only be performed on systems and environments that
you are authorised to test.

Do not:

- Access another user's account or data
- Modify or delete real user information
- Perform denial-of-service testing
- Flood API endpoints
- Attempt to obtain production credentials
- Publicly disclose unresolved vulnerabilities

Local or approved development environments should be used whenever possible.

## Vulnerability Response

When a vulnerability is reported, the project team should:

1. Review and reproduce the issue.
2. Identify the affected component.
3. Assess the security impact.
4. Develop and test a fix.
5. Review the change before merging.
6. Confirm that the vulnerability has been resolved.

Security improvements should be documented where appropriate.
