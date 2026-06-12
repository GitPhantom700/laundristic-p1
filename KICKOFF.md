# Tally — Kickoff Kit

Seven files. Drop them at the repo root (docs noted below), then follow Day 1.

| File | Purpose | Lives at |
|---|---|---|
| KICKOFF.md | This guide. Delete after Day 1. | — |
| SPEC.md | What Tally is. Frozen scope. | `/docs/SPEC.md` |
| PLAN.md | Lane-tagged work packages + ownership map. | `/docs/PLAN.md` |
| CLAUDE.md | Claude Code standing rules. | repo root |
| AGENTS.md | Antigravity/Gemini standing rules. | repo root |
| PROGRESS.md | Handoff file. Updated every session by whichever tool worked. | repo root |
| PLAYBOOK-TEMPLATE.md | Reusable two-tool routing template for future projects. | keep outside repo or in `/docs/` |

## Day 1 sequence

1. Create the GitHub repo (`tally`, public, MIT) — 2 min on github.com, or let P0.1 do it via `gh`.
2. Copy kit files into place. Commit: `chore: kickoff kit`.
3. Open **Claude Code** (Sonnet). First prompt:
   > Read CLAUDE.md, docs/PLAN.md, PROGRESS.md. Execute package P0.1 only. Stop after acceptance criteria pass.
4. When P0.1 is committed, **switch to Antigravity** (Gemini). First prompt:
   > Read AGENTS.md, docs/PLAN.md, PROGRESS.md. Execute package P0.2 only.
5. From then on: PROGRESS.md always names the next package and its lane. Open that tool, paste the same one-line pattern, go.

## The three rules that protect your Pro window

1. **One package per Claude Code session.** Start with the read-prompt above, end with commit + PROGRESS.md update, then close the session.
2. **Check `/usage` when a Claude Code session starts.** Under ~25% session budget left → don't start a CC package; do an AG package instead.
3. **Never select Claude models inside Antigravity** — that bills your API key separately. Gemini only there.
