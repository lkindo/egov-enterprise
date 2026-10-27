---
name: brainstorming
description: "Use when the user asks to explore an idea or a design before implementation, or when the intent is ambiguous enough to change the result. Explores user intent, requirements and design."
source: obra/superpowers (https://github.com/obra/superpowers, 이 저장소에서 수정함)
license: MIT — Complete terms in LICENSE.txt
---

# Brainstorming Ideas Into Designs

## Overview

Help turn ideas into fully formed designs and specs through natural collaborative dialogue.

Start by understanding the current project context, then ask questions one at a time to refine the idea. Once you understand what you're building, present the design in small sections (200-300 words).

**In this repository:** Use [AGENTS.md Verification by change scope](../../../AGENTS.md#verification-by-change-scope) and [the orchestration SOP](../../../docs/03-guides/orchestration-protocol.md) (§3 Stage 1 approval, §2.3 audit, §2.4 failure recovery, §6 time budget). Ask only the questions whose answers change the result; when the request is clear or a standing approval covers the work, state your assumptions and proceed. A design document under review follows SOP §7 (review budget, decision cards with negative tests) instead of section-by-section approval.

## The Process

**Understanding the idea:**
- Check out the current project state first (files, docs, recent commits)
- Ask questions one at a time to refine the idea
- Prefer multiple choice questions when possible, but open-ended is fine too
- Only one question per message - if a topic needs more exploration, break it into multiple questions
- Focus on understanding: purpose, constraints, success criteria

**Exploring approaches:**
- Propose 2-3 different approaches with trade-offs
- Present options conversationally with your recommendation and reasoning
- Lead with your recommended option and explain why

**Presenting the design:**
- Once you believe you understand what you're building, present the design
- Break it into sections of 200-300 words
- Ask for confirmation only where an answer would change the design
- Cover: architecture, components, data flow, error handling, testing
- Be ready to go back and clarify if something doesn't make sense

## After the Design

**Documentation:**
- In this repository there is no `docs/plans/`. Keep a one-off design in the conversation or PR description; a durable design goes in a kebab-case file under `docs/01-product`·`02-architecture`·`03-guides`·`04-operations` with the `docs/README.md` index updated (AGENTS.md "Documentation and memory")
- Use elements-of-style:writing-clearly-and-concisely skill if available
- Commit within the user's request (for directly assigned work, through its completion scope), only your own paths with `git commit --only -- <paths>`, and stop instead if another task's changes share a path (AGENTS.md "공유 워킹트리와 Git")

**Implementation (if continuing):**
- If the request or a standing approval covers implementation, continue; otherwise ask whether to implement
- Use using-git-worktrees when isolation is needed
- Use writing-plans to create detailed implementation plan

## Key Principles

- **One question at a time** - Don't overwhelm with multiple questions
- **Multiple choice preferred** - Easier to answer than open-ended when possible
- **YAGNI ruthlessly** - Remove unnecessary features from all designs
- **Explore alternatives** - Always propose 2-3 approaches before settling
- **Incremental validation** - Present design in sections; confirm only what changes the design
- **Be flexible** - Go back and clarify when something doesn't make sense
