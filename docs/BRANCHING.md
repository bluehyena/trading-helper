# Branching Policy

Trading Helper uses GitHub Flow.

## Branches

- `main` is the stable branch.
- New work starts from `main`.
- Use `feature/*` for product additions.
- Use `fix/*` for bugs.
- Use `docs/*` for documentation-only work.
- Use `chore/*` for maintenance.

## Pull Requests

- Open a pull request before merging into `main`.
- CI must pass before merge.
- UI changes should include screenshots.
- Financial language must remain analysis-only.
- Do not add broker order execution without a separate design discussion.

## Releases

- Use tags in the form `vX.Y.Z`.
- Keep release notes focused on user-visible changes, migration notes, and known limitations.
