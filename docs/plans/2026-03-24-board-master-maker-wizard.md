# Board Master Maker Wizard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a 4-step wizard for administrative users to create new boards and link them to the menu system without coding.

**Architecture:**
- **Frontend (Next.js)**: New Page `/admin/community/boards/maker` using a Step-based Wizard UI.
- **Service Layer**: Orchestration of `BoardAdminService` and `MenuAdminService` to ensure both board metadata and menu entries are created.
- **Backend (Spring Boot)**: Existing `BoardMasterApiController` and `MenuApiController` will be leveraged.
- **Metadata**: Utilize `bbsTyCode`, `tmplatId`, and `bbsAttrbCode` in `NBBSMASTER` for dynamic template selection.

**Tech Stack:** Next.js, TypeScript, TailwindCSS, React Hook Form, Lucide-react, Shadcn/UI.

---

### Task 1: Environment Setup & Directory Preparation

**Files:**
- Create: `frontend/src/app/admin/community/boards/maker/page.tsx`
- Create: `frontend/src/app/admin/community/boards/maker/components/BoardMakerWizard.tsx`

**Step 1: Create the basic page structure**
Create a skeleton for the wizard page.
**Step 2: Commit**
`git add . && git commit -m "feat(admin): initialize board maker wizard page"`

---

### Task 2: Step 1 - Basic Info Form

**Files:**
- Modify: `frontend/src/app/admin/community/boards/maker/components/BoardMakerWizard.tsx`

**Step 1: Implement Step 1 UI**
Add fields for Board Name (`bbsNm`) and Description (`bbsIntrcn`).
**Step 2: Add validation**
Use `zod` and `react-hook-form` for mandatory fields.
**Step 3: Commit**
`git commit -m "feat(admin): add Step 1 (Basic Info) to Board Maker Wizard"`

---

### Task 3: Step 2 - Template & Theme Selection

**Files:**
- Modify: `frontend/src/app/admin/community/boards/maker/components/BoardMakerWizard.tsx`

**Step 1: Implement Template Library UI**
Show 3 cards for Type A (Hub), B (List), C (Gallery) with icons.
**Step 2: Add Theme Selection**
Color picker or preset color palette (Dynamic Theme Overlays).
**Step 3: Commit**
`git commit -m "feat(admin): add Step 2 (Template & Theme) to Board Maker Wizard"`

---

### Task 4: Step 3 - Permission Matrix

**Files:**
- Modify: `frontend/src/app/admin/community/boards/maker/components/BoardMakerWizard.tsx`

**Step 1: Create Role-Based Matrix table**
Rows for Roles (Admin, User, Guest), columns for Permissions (Read, Write, Reply, Comment).
**Step 2: Bind state**
Ensure selections are captured in the form state.
**Step 3: Commit**
`git commit -m "feat(admin): add Step 3 (Permissions) to Board Maker Wizard"`

---

### Task 5: Step 4 - Menu Publishing & Integration

**Files:**
- Modify: `frontend/src/app/admin/community/boards/maker/components/BoardMakerWizard.tsx`
- Modify: `frontend/src/services/admin/system/MenuAdminService.ts`

**Step 1: Update Menu interface**
Add `modernRoute` to `Menu` interface in `MenuAdminService.ts`.
**Step 2: Implement Step 4 UI**
Select Parent Menu, enter Menu Name, and Order.
**Step 3: Orchestration Logic**
On Submit, call `BoardAdminService.createBoardMaster`, then `MenuAdminService.createMenu` with the generated `bbsId` path.
**Step 4: Verification**
Add a success notification and redirect to the new board.
**Step 5: Commit**
`git commit -m "feat(admin): add Step 4 (Menu Integration) and finalize Wizard"`

---

### Task 6: Final Polish & Verification

**Files:**
- Modify: `frontend/src/app/admin/community/boards/selectBoardList/BoardListClient.tsx` (Add "Create with Maker" button)

**Step 1: Add Link to List Page**
Add a button in the Board List page to navigate to the Wizard.
**Step 2: Test the whole flow**
Create a test board, verify menu entry, and browse the new board.
**Step 3: Commit**
`git commit -m "feat(admin): enable Board Maker Wizard from List UI"`
