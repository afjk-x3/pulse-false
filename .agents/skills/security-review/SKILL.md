---
name: security-review
description: Checks new or changed code against common vulnerability classes before deploy. Use before merging authentication, database, file upload, API, or payment-related code, when the user asks for a security check, or references OWASP, vulnerability assessment, or penetration testing.
---

# Security Review

Review code against real, exploitable vulnerability classes. Reference OWASP Top 10 categories where relevant, but explain findings in plain terms, not just a category label.

## Checklist by category

**Injection**
- SQL, NoSQL, or command queries built with string concatenation instead of parameterized queries or an ORM
- User input passed to `eval`, `exec`, shell commands, or template rendering without sanitization

**Broken authentication / session handling**
- Passwords stored without hashing (bcrypt, argon2, not MD5/SHA1 alone)
- Session tokens with no expiry or that don't rotate on privilege change
- Missing auth checks on routes that should require login

**Broken access control**
- Endpoints that check "is logged in" but not "is allowed to access this specific resource" (e.g. user A can fetch user B's data by changing an ID in the URL)
- Admin routes reachable without a role check

**Sensitive data exposure**
- API keys, secrets, or tokens hardcoded in source
- Client-side code (`NEXT_PUBLIC_` vars, frontend JS) exposing anything meant to stay server-side
- Error messages that leak stack traces, file paths, or internal details to the client

**Cross-site scripting (XSS)**
- User input rendered into HTML without escaping
- `dangerouslySetInnerHTML` or equivalent used with unsanitized input

**CSRF and CORS**
- State-changing requests (POST/PUT/DELETE) without CSRF protection where cookies are used for auth
- CORS configured with `*` alongside credentialed requests

**Insecure file handling**
- File uploads without type/size validation
- File paths built from user input without sanitization (path traversal)

**Dependency risk**
- New dependencies added without checking for known CVEs
- Outdated packages with known vulnerabilities still in use

## Output format

```
Findings by severity:

Critical: [exploitable now, e.g. SQLi, auth bypass]
- [finding, file:line, exploit scenario in one sentence]

High: [real risk, needs fix before deploy]
- [finding, file:line]

Medium/Low: [worth fixing, not blocking]
- [finding, file:line]

Clean: [areas checked with no issues found]
```

Always state the exploit scenario in one sentence. "Missing input validation" is not useful. "An attacker can pass `' OR 1=1--` in the login field to bypass authentication" is useful.

## What not to do

- Don't flag theoretical risks with no realistic attack path just to pad the list.
- Don't recommend a fix without confirming it doesn't break the existing feature.
- This skill reviews code for weaknesses. It does not write exploit code or attack tooling, even for the same codebase.
