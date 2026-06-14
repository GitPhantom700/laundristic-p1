# Contributing to Laundristic

Thank you for contributing to Laundristic! This project uses a very specific two-lane development workflow to manage scope and minimize merge conflicts.

## The Two-Lane Workflow

We use two distinct AI lanes (or developer roles) for this project:

1. **Claude Code (Lane CC):** The "scalpel." Owns complex domain logic, storage layers, and critical algorithms (like the missing-item loop and export/import).
2. **Antigravity (Lane AG):** The "volume." Owns UI components, screens, test suites, documentation, and deployment configurations.

**Golden Rule:** If your package requires editing a file outside your designated lane, **STOP**. Note the blocker in `PROGRESS.md` and hand off the task to the other lane.

For detailed rules on agent responsibilities, please review `AGENTS.md` and `CLAUDE.md`.

## Setup and Development

1. Clone the repository and install dependencies:
   ```bash
   npm ci
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```

## Testing

Laundristic uses `vitest` for unit and property testing, heavily relying on `fake-indexeddb` to mock browser storage.

1. Run the test suite:
   ```bash
   npm run test
   ```
2. Generate coverage reports:
   ```bash
   npm run test:coverage
   ```

## Formatting & Linting (CRITICAL)

The project uses a strict Prettier and ESLint configuration. **The GitHub Actions CI pipeline will fail if files are not properly formatted.**

Before every commit, you MUST run:

```bash
npm run format:check
```

If it fails, automatically fix formatting issues by running:

```bash
npx prettier --write .
```

## Making Commits

1. Complete exactly ONE work package per session (as defined in `docs/PLAN.md`).
2. Update `PROGRESS.md` to log your decisions, blockers, and handoff notes for the next developer/agent.
3. Commit using conventional commit messages (e.g., `feat:`, `fix:`, `docs:`).
4. Push to `main`. Ensure CI passes.
