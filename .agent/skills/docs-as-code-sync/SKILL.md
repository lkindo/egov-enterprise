---
name: docs-as-code-sync
description: >-
  Autonomous documentation synchronization skill. Triggers when significant architectural logic,
  APIs, or DB schemas are modified. Automatically updates corresponding Markdown docs,
  Mermaid diagrams, and Constitutions to prevent documentation drift.
version: 1.0.0
---

# Docs-as-Code Sync Skill (Antigravity Native)

**Use this skill when:** You complete a task that alters business logic, modifies database structures, introduces new APIs, or changes the overall system architecture.

---

## 1. Core Objective: Zero Documentation Debt

Code changes constantly, but documentation often rots. The **Docs-as-Code Sync** skill keeps the eGov-Enterprise source set—`AGENTS.md`, `.agent/knowledge/` constitutions, accepted ADRs, current code/configuration, and `docs/`—consistent without treating the Gemini/Claude adapters as policy originals.

---

## 2. Synchronization Protocol

When a significant code change is made, execute the following steps before reporting the task as complete:

1. **Impact Radius Analysis**: Identify which documents are affected by the code change (e.g., API documentation, testing guides, DB standard terms).
2. **Mermaid Diagram Sync**: If architectural flow or DB relationships changed, locate the relevant ````mermaid` blocks in the docs and rewrite the topology graph.
3. **Constitution Proposal**: If a new standard was established (e.g., a new DB abbreviation), identify the affected Constitution and request the explicit user approval required by `AGENTS.md` before changing it.
4. **Validation**: Ensure no dangling links or conflicting legacy statements remain.

## 3. Output Requirements

Print the following block after syncing:

```markdown
### 📚 [DOCS-AS-CODE SYNC REPORT] ###
- **Triggered By**: Modification of `AuthService.java`
- **Updated Artifacts**:
  - `docs/02-architecture/domain-resilience.md` (Updated Mermaid flow for Auth)
- **Status**: SSOT perfectly synchronized.
#####################################
```
