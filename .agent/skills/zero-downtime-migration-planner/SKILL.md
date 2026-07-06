---
name: zero-downtime-migration-planner
description: >-
  Database migration strategist skill. Triggers when adding, altering, or dropping DB schema objects.
  Enforces the Expand-and-Contract pattern to guarantee zero-downtime PostgreSQL deployments.
version: 1.0.0
---

# Zero-Downtime Migration Planner Skill (Antigravity Native)

**Use this skill when:** Proposing or executing any changes to the PostgreSQL database schema (e.g., adding columns, renaming fields, dropping tables).

---

## 1. Core Objective: Unbreakable Persistence

In an enterprise environment, `ALTER TABLE` can lock out users and cause systemic outages. The **Zero-Downtime Migration Planner** ensures that all schema changes follow the safe, phased "Expand and Contract" pattern.

---

## 2. The Expand-and-Contract Ruleset (Per DB Constitution Article 7)

Never execute destructive DDL (`DROP`, `RENAME`) directly. Follow this phases:

### Phase 1: Expand (Add)
- Add the new column/table alongside the old one.
- *Rule*: New columns must be nullable or have a default value to not break legacy inserts.

### Phase 2: Migrate (Dual Write/Read)
- Update the backend to write to BOTH the old and new columns.
- Backfill historical data via an idempotent background script.

### Phase 3: Contract (Drop) - *Only in subsequent deployments*
- Once the application strictly uses the new column, `DROP` the old column.

## 3. Execution via DB Bridge
Before applying to the physical DB, you must validate the syntax using the local `db-bridge.js`. Wrap migrations in explicit `BEGIN; ... COMMIT;` blocks.

## 4. Output Requirements

```markdown
### 💾 [ZERO-DOWNTIME MIGRATION REPORT] ###
- **Target Table**: `TN_USER_MASTER`
- **Operation**: Rename `USER_NM` to `MBR_NM`
- **Expand-and-Contract Strategy**:
  1. Add `MBR_NM` (Nullable).
  2. Create DB Trigger to sync `USER_NM` -> `MBR_NM`.
- **Status**: Safe DDL generated. Awaiting DBA/User approval to execute.
##########################################
```
