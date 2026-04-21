# Security Policy

[한국어](./SECURITY.ko.md)

## Supported Versions

The `main` branch is the actively supported development branch until the first stable release.

## Reporting a Vulnerability

Please do not open public issues for vulnerabilities involving secrets, prompt injection, or API key exposure. Email the project maintainer or use GitHub private vulnerability reporting once enabled.

## Secret Handling

- Provider keys must stay server-side in environment variables.
- Do not send `OPENAI_API_KEY`, `GEMINI_API_KEY`, or market data keys to the browser.
- Do not add telemetry that includes prompts, API keys, or raw user conversations by default.
