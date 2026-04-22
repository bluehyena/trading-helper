# Coding Style

## General

- Prefer TypeScript with strict types.
- Keep market data, signals, and AI provider logic separated.
- Keep API keys server-side only.
- Use fixture-based tests for market data behavior.
- Avoid live API dependencies in CI.

## UI

- Dashboard controls should be compact, visible, and keyboard-accessible.
- Do not hide data freshness or source limitations.
- Mobile layouts should stack or simplify rather than overlap.
- Use bilingual copy for user-facing features.

## Financial Safety

- Do not present analysis as guaranteed outcomes.
- Do not add broker execution or exact order placement flows.
- Always preserve the disclaimer that investment decisions and losses are the user’s responsibility.
