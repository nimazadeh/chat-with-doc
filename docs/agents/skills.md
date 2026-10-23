# Engineering workflow

Vendored from https://github.com/mattpocock/skills/tree/main/skills/engineering on 2026-10-23. Upstream main observed at `5beb35b040e3de97e54fa9e386d7e42d15c295c2`; upstream MIT license is included alongside the files. All engineering instructions and supplementary files were read during planning; reread applicable references before execution.

## Selection

- Clarify with grill-with-docs and domain-modeling; record only domain vocabulary in the glossary.
- Synthesize with to-spec, then to-tickets; local tracker and test interfaces were approved by the user.
- Use implement per authorized ticket, tdd at approved seams, and codebase-design for module shape. Do not use implement-spec to bypass the one-ticket permission gate.
- Close each ticket with code-review on standards and spec fidelity against the ticket's recorded starting revision; include uncommitted changes where applicable.
- Use diagnosing-bugs for difficult failures, research for uncertain external facts, prototype only for an unresolved runnable design question, and wizard only for actions the human must perform.
- Use pr only when preparing a requested PR, triage for incoming raw requests, architecture review when concrete friction warrants it, wayfinder for genuinely unresolved multi-session decisions, and retro for improvements to the development environment.

## Tool and instruction adaptations

Skill files are reference instructions, not executable tool registrations. This environment has no Skill tool or independent subagent tool: apply the workflows directly and do not claim separate parallel reviewers ran. Two-axis review must remain explicit even if performed sequentially.

The session branch is fixed. Never create prototype, research, integration, or worktree branches even when upstream skills suggest them. User permission gates override autonomous whole-spec implementation. User reports remain in report.md rather than skill-specific report formats. No automatic push, PR, or merge is required.

Upstream references skills outside the requested engineering folder (for example grilling and writing-for-agents). These are not included here; do not claim to have installed or invoked those missing tools.
