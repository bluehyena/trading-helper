# Contributing

[한국어](./CONTRIBUTING.ko.md)

Thanks for helping improve Trading Helper.

## Development

```bash
npm install
npm run dev
```

Before opening a pull request, run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Guidelines

- Keep the app analysis-only. Do not add broker order execution without a separate design discussion.
- Do not log API keys, prompts with secrets, or full provider responses that may include user data.
- Add fixture-based tests for data adapters. CI should not depend on live market APIs.
- Label data freshness and source limitations clearly in user-facing flows.
- Prefer small, focused pull requests.
