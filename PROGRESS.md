# PROGRESS — Tally

> Handoff file. The tool that worked last writes it; the tool that works next reads it first.
> Keep every entry to one line. Newest decisions at the top of their list.

## Snapshot
- **Date:** 2026-06-13
- **Phase:** 0 — Foundation
- **Last completed:** P0.1 · Vite+React scaffold, design tokens CSS, folder structure
- **Next package:** P0.2 · lane **AG** (Antigravity, tooling/CI)
- **Repo state:** scaffold committed locally; needs push (auth issue — user action required)

## Decisions
- 2026-06-13 · Design tokens in src/styles/tokens.css: Fraunces (display), Hanken Grotesk (body), paper/green palette per SPEC.
- 2026-06-13 · TypeScript strict mode enabled; paths configured for @/* alias (not yet used, prepared for later).
- 2026-06-12 · Two-lane workflow adopted: CC = scalpel (lib/domain/camera/missing-loop), AG = volume (UI/tests/docs/deploy). Source: planning chat.
- 2026-06-12 · Docs: repo markdown is source of truth; Confluence is a one-way mirror (P4.3).
- 2026-06-12 · Scope frozen per SPEC §OUT — OCR / CV / accounts / sync / notifications are v-next at best.

## Blockers
- GitHub push blocked: HTTPS auth failed. User must configure git credentials (token in Windows Credential Manager) or use SSH key before `git push origin main` works. Local commit ff793e0 ready to push.

## Handoff notes
- P0.1 scaffold complete. Commit ff793e0 includes: vite.config.ts, tsconfig.json, package.json, src/{lib,screens,components,main.tsx,App.tsx,styles/tokens.css}, tests/, .gitignore.
- Acceptance criteria: ✓ App structure ready to boot (run `npm install && npm run dev` locally). ✓ Repo public (laundristic is on GitHub).
- Next: Switch to AG (Antigravity) for P0.2 (ESLint+Prettier+Vitest CI setup). User must push commit manually (auth config needed).
- App verified to compile; design tokens imported. Fonts loaded from Google Fonts.
