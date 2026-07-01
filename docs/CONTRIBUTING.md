# Contributing

Thanks for your interest in Laundristic! It's a local-first, offline PWA (MIT
licensed) — contributions and forks are welcome.

## Prerequisites

- **Node.js 20+** (the CI pipeline runs Node 20)
- npm (bundled with Node)

## Setup and development

1. Clone the repository and install dependencies:
   ```bash
   npm ci
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```

## Project layout

- `src/lib/` — pure, unit-tested logic (storage, domain state machine, camera,
  code generation, backup). UI imports from here; this layer never imports UI.
- `src/components/` and `src/screens/` — React UI built on top of `src/lib`.
- `tests/` — Vitest unit and property tests against the `src/lib` public API.
- `docs/` — architecture, data model, design, and user documentation.

## Testing

Laundristic uses `vitest` for unit and property testing, with `fake-indexeddb`
to mock browser storage.

```bash
npm run test            # run the suite
npm run test:coverage   # with coverage
```

## Formatting & linting (important)

The project uses a strict Prettier + ESLint configuration. **CI fails if files
aren't formatted or lint-clean.** Before committing:

```bash
npm run format:check
npm run lint
```

If formatting fails, auto-fix it:

```bash
npx prettier --write .
```

## Submitting changes

1. Fork the repo and create a feature branch.
2. Keep changes focused. The product scope is intentionally frozen — please check
   `docs/SPEC.md` (§"Explicitly OUT of scope") before proposing large new
   features, and open an issue to discuss anything substantial first.
3. Make sure `npm run lint`, `npm run format:check`, `npm run test`, and
   `npm run build` all pass.
4. Use conventional commit messages (e.g. `feat:`, `fix:`, `docs:`).
5. Open a pull request describing what changed and why.

By contributing, you agree that your contributions are licensed under the
project's [MIT License](../LICENSE).
