# PLAYBOOK — Two-Tool Agent Routing (reusable template)

> Run two agentic coding tools on one repo without conflicts or wasted tokens.
> To instantiate for a new project: copy this file + the four companions
> (CLAUDE.md, AGENTS.md, PROGRESS.md, PLAN.md skeleton), fill every {{blank}},
> commit at repo root. ~5 minutes.

## Roles (fill in)
| Role | Tool / model | Subscription pool | Owns |
|---|---|---|---|
| **Plan** | {{e.g. claude.ai chat (Fable)}} | shared w/ Scalpel | specs, decisions, reviews, scope calls |
| **Scalpel** | {{e.g. Claude Code / Sonnet}} | {{e.g. Anthropic Pro — SCARCE}} | {{hard/architectural dirs, e.g. /src/lib}} |
| **Volume** | {{e.g. Antigravity / Gemini}} | {{e.g. Google sub — ABUNDANT}} | {{bulk dirs, e.g. UI, /tests, /docs, deploy}} |

Routing principle: the scarcer pool gets the work where model quality changes the outcome (architecture, state machines, tricky integrations, consolidated review). The abundant pool gets volume (UI against established patterns, tests, docs, polish, QA). Cross-billing rule: never select Pool-A's models inside Pool-B's tool — check whether it bills an API key.

## The five mechanics
1. **Package granularity.** Work = packages sized to ONE session, each with acceptance criteria and a lane tag. Never micro-tasks (context reload per switch is the dominant token cost); never multi-feature epics (context bloat).
2. **Ownership map.** Per phase, each directory has exactly one writer. The other tool consumes public APIs only. Blocked? Write it in PROGRESS.md and stop — no cross-lane edits, ever.
3. **PROGRESS.md handoff.** One file: Snapshot (last done / next package+lane), Decisions (one-liners, append-only), Blockers, Handoff notes. Written at the end of every session, read at the start of the next. This file IS the switch mechanism: it tells the human which tool to open.
4. **Standing rules files.** CLAUDE.md / AGENTS.md (or the tool's equivalent) carry: session protocol, lane check ("wrong lane → tell user to switch"), ownership map pointer, git habits (commit+push per task, PROGRESS.md per session), token discipline, frozen scope pointer.
5. **Scope firewall.** SPEC.md freezes stack + OUT-list. Build sessions never debate scope; scope questions route to the Plan lane. (This is what keeps agents from "helpfully" expanding the project.)

## Token discipline (scarce pool)
- One package per session; open with "Read {{rules file}}, PLAN, PROGRESS. Execute {{Pn.m}} only."
- Cheapest capable model for mechanical work ({{e.g. /model haiku}}); flagship only where it changes the outcome.
- Compact/clear context at package boundaries; never let the agent crawl dirs the package doesn't need.
- Check usage meter at session start ({{e.g. /usage}}); below ~25% → run a Volume-lane package instead.

## Failure modes this prevents
| Failure | Prevented by |
|---|---|
| Merge conflicts between agents | one-writer ownership map |
| Token burn on re-orientation | session-sized packages, not micro-tasks |
| Architectural drift between tools | Scalpel reviews Volume at phase gates (a consolidated package, not per-task) |
| Scope creep mid-session | SPEC firewall + parking lot |
| Lost work at limit lockout | commit-per-task + PROGRESS-per-session = any stop is free |

## Instantiation checklist
- [ ] Fill role table; mark which pool is SCARCE
- [ ] Write SPEC.md (north-star, frozen stack, explicit OUT-list, definition of done)
- [ ] Draft PLAN.md: phases → packages → lane tags → acceptance criteria → ownership map
- [ ] Adapt CLAUDE.md / AGENTS.md headers to this project's dirs
- [ ] Reset PROGRESS.md snapshot to package 1
- [ ] First session in each tool starts with the standard read-prompt

*Instantiated examples: Tally (2026-06). Candidates: TARS-E Phase 4+, Logi-Supply MVP.*
