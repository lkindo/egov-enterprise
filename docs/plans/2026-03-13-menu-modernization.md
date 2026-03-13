# Menu Routing & Structure Modernization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Modernize legacy URL patterns (`/cop/...`, `/uss/...`) in the menu system and resolve duplicate mapping issues for the survey module to ensure structural consistency.

**Architecture:**
1.  **DB Update**: Update `nmenuinfo.modern_route` values to follow the RESTful `/admin/...` or `/workspace/...` pattern.
2.  **Frontend Reorganization**: Folder movement in `frontend/src/app` to match new routes while preserving component logic.
3.  **Survey Granularity**: Split the monolithic `/admin/survey/manage` route into specific functional routes.

**Tech Stack:** Supabase (PostgreSQL), Next.js (App Router), Tailwind CSS.

---

### Task 1: Update DB Menu Routes (Modernization)

**Files:**
- Modify: Supabase DB (`nmenuinfo` table)

**Step 1: Execute SQL to update legacy routes to modern patterns**

```sql
-- Update Cop/Uss routes to Admin patterns
UPDATE nmenuinfo SET modern_route = '/admin/collaboration/scraps' WHERE menu_no = '4040000'; -- 스크랩 목록
UPDATE nmenuinfo SET modern_route = '/admin/community/boards' WHERE menu_no = '4020000'; -- 게시판사용정보 
UPDATE nmenuinfo SET modern_route = '/admin/collaboration/address-book' WHERE menu_no = '4150000'; -- 주소록관리
UPDATE nmenuinfo SET modern_route = '/admin/user/absences' WHERE menu_no = '5430000'; -- 사용자부재관리

-- Survey Granularity Updates (Based on standard mapping)
UPDATE nmenuinfo SET modern_route = '/admin/survey/templates' WHERE menu_no = '2220000'; -- 설문지관리
UPDATE nmenuinfo SET modern_route = '/admin/survey/questions' WHERE menu_no = '2230000'; -- 설문항목관리
UPDATE nmenuinfo SET modern_route = '/admin/survey/manage' WHERE menu_no = '2240000'; -- 설문관리
UPDATE nmenuinfo SET modern_route = '/admin/survey/stats' WHERE menu_no = '2260000'; -- 설문통계
UPDATE nmenuinfo SET modern_route = '/admin/survey/polls' WHERE menu_no = '5270000'; -- 온라인poll관리
```

**Step 2: Verify DB changes**

Run: `SELECT menu_no, menu_nm, modern_route FROM nmenuinfo WHERE menu_no IN ('4040000', '4020000', '4150000', '5430000', '2220000', '2230000', '2240000', '2260000', '5270000');`
Expected: All routes updated to new patterns.

### Task 2: Reorganize Frontend Folders (Collaboration & Community)

**Files:**
- Move: `frontend/src/app/cop/scp` -> `frontend/src/app/admin/collaboration/scraps`
- Move: `frontend/src/app/cop/adb` -> `frontend/src/app/admin/collaboration/address-book`
- Move: `frontend/src/app/cop/bbs` -> `frontend/src/app/admin/community/boards`

**Step 1: Create directory structures and move files**

```bash
mkdir -p frontend/src/app/admin/collaboration/scraps
mkdir -p frontend/src/app/admin/collaboration/address-book
mkdir -p frontend/src/app/admin/community/boards

# Move contents
mv frontend/src/app/cop/scp/* frontend/src/app/admin/collaboration/scraps/
mv frontend/src/app/cop/adb/* frontend/src/app/admin/collaboration/address-book/
mv frontend/src/app/cop/bbs/* frontend/src/app/admin/community/boards/
```

**Step 2: Update internal links in moved pages**

Search and replace `@/app/cop/...` with `@/app/admin/collaboration/...` or relevant paths in the moved `page.tsx` files.

**Step 3: Commit**

```bash
git add frontend/src/app/admin
git commit -m "refactor: modernize collaboration and community frontend routes"
```

### Task 3: Survey Module Granularity Implementation

**Files:**
- Create: `frontend/src/app/admin/survey/templates/page.tsx`
- Create: `frontend/src/app/admin/survey/questions/page.tsx`
- Modify: `frontend/src/app/admin/survey/manage/page.tsx`

**Step 1: Duplicate existing manage page to specific functional pages**

```bash
cp frontend/src/app/admin/survey/manage/page.tsx frontend/src/app/admin/survey/templates/page.tsx
cp frontend/src/app/admin/survey/manage/page.tsx frontend/src/app/admin/survey/questions/page.tsx
```

**Step 2: Customize individual pages**

- `templates/page.tsx`: Update Title to "설문지 템플릿 관리"
- `questions/page.tsx`: Update Title to "설문 항목 관리"

**Step 3: Commit**

```bash
git add frontend/src/app/admin/survey
git commit -m "feat: add granular survey management pages"
```

### Task 4: Final Verification

**Step 1: Run build to check for broken imports**

Run: `npm run build` (in frontend directory)
Expected: Success.

**Step 2: Verify Sidebar Navigation**

Check `frontend/src/app/components/layout/sidebar.tsx` to ensure it correctly renders the new routes from the DB.
