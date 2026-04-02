# Frontend Mojibake Recovery Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore corrupted Korean strings (Mojibake) in frontend files while ensuring normal code containing `?` (ternary, optional chaining, etc.) remains untouched.

**Architecture:** 
- A specialized Python recovery script using a mapping of verified Mojibake sequences to correct Korean text.
- Regex-based detection that isolates Mojibake sequences (e.g., non-ASCII characters + corrupted symbols) from standard TS/JS code symbols.

**Tech Stack:** Python (for string manipulation and encoding recovery), PowerShell (for file finding), Regex.

---

### Task 1: Mapping & Script Preparation

**Files:**
- Create: `scripts/recovery/mojibake_map.json`
- Create: `scripts/recovery/restore_mojibake.py`

**Step 1: Define verified Mojibake patterns**
Create a mapping based on analysis:
- `寃쎈줈` -> `경로`
- `濡쒓렇님` -> `로그인`
- `愿€由ъ옄` -> `관리자`
- `?ъ슜님` -> `사용자`
- `?쒖뒪님` -> `시스템`
- `?덇굅님` -> `레거시`
- `?명솚님` -> `호환성` (context: 하위 호환성)
- `?뺤씤` -> `확인`
- `?щ?` -> `여부`
- `?€湲?以묒씤` -> `대기 중인`
- `寃곗옱` -> `결재`
- `?명뀛由ъ쟾님` -> `인텔리전스`
- `?뚰겕?뚮줈님` -> `워크플로우`
- `?ㅼ떆媛님` -> `실시간`
- `?臾닿껐님` -> `무결성`
- `?피드` -> `피드`

**Step 2: Implement safe replacement logic**
The script must:
1. Load a file as UTF-8.
2. Use a regex to find strings/comments containing Mojibake.
3. Replace only if it matches known bad patterns.
4. If a single `?` is found, it must ONLY be replaced if it's immediately adjacent to other Mojibake characters.

### Task 2: Dry Run & Targeted Files Identification

**Step 1: Generate affected files list**
Run search to find all files with identified patterns.

**Step 2: Manual review of ambiguous cases**
Check `middleware.ts` and `layout.tsx` specifically as they are critical and contain many normal `?` symbols.

### Task 3: Execution - Sequential Recovery

**Step 1: Fix middleware and common UI components**
- `frontend/src/middleware.ts`
- `frontend/src/app/components/ui/app-notification-drawer.tsx`
- `frontend/src/app/components/ui/workflow-canvas.tsx`

**Step 2: Fix Remaining files** (e.g., `StatCardSection.tsx`, `standard-date-picker.tsx`)

**Step 3: Verification**
Run `npm run build` in the frontend directory to ensure no syntax errors were introduced.
Check a few files manually.

### Task 4: Final Cleanup & Summary

**Step 1: Delete recovery scripts**
**Step 2: Update task_fix_headers.md to Complete**
