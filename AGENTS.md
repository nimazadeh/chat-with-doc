# Working agreement

- Read `CODING_STANDARDS.md`, the active ticket, and `.scratch/personal-learning/spec.md` before implementation.
- Read relevant engineering skills in `.workspace/matt-pocock-skills/` before using their workflows. See `docs/agents/skills.md` for selection and environment constraints.
- Implement only one explicitly authorized ticket at a time. Plan approval is not implementation approval. Finish its tests and audits before requesting authorization for the next ticket.
- Ask all questions using the question-box tool. Put all progress, audit, and completion reports only in `report.md`, replacing the previous report.
- Never store real secrets, uploaded documents, or learning histories in Git. Do not ask for API keys in chat.

## Agent skills

### Issue tracker

Local Markdown: `.scratch/personal-learning/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default role strings; execution authorization is separate from readiness. See `docs/agents/triage-labels.md`.

### Domain docs

Single context: root `GLOSSARY.md`, optional `docs/adr/`. See `docs/agents/domain.md`.
