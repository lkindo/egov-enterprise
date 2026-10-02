import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import type { APIRequestContext, BrowserContextOptions, Locator, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../fixtures/browser-test';
import { createVisualAdmin } from '../fixtures/visual-admin';
import { DeptJobPage } from '../pages/DeptJobPage';
import { buildSpecScope, type ConsoleErrorGuard } from '../fixtures/error-detector';
import { assertIsolatedTarget } from '../../../scripts/e2e-isolation.mjs';
import { ENTERPRISE_TASKS, EnterpriseObservation, LAB_CONTEXT, persistTaskMeasurement,
  type CacheMode, type EnterpriseTask } from '../helpers/enterprise-task-observation';

const USERS = '/api/v1/admin/system/users';
const DEPARTMENTS = '/api/v1/admin/system/departments';
const SURVEYS = '/api/v1/admin/system/surveys';
const RESPONSES = '/api/v1/admin/system/survey-responses';
type ActorPage = (options?: BrowserContextOptions) => Promise<{ page: Page; context: Page['context'] extends () => infer C ? C : never; guard: ConsoleErrorGuard }>;
type Context = { page: Page; observation: EnterpriseObservation; api: APIRequestContext; baseURL: string;
  actorPage: ActorPage; suffix: string; guard: ConsoleErrorGuard; scope: string;
  guards: ConsoleErrorGuard[]; defer: (cleanup: () => Promise<void>) => void };
type Workflow = { route: string; ready: () => Promise<void>; execute: () => Promise<void> };
class PendingReadbackError extends Error {
  constructor() { super('Owned task readback is not present yet (HTTP 404).'); }
}

async function read<T>(api: APIRequestContext, route: string): Promise<T> {
  const response = await api.get(route);
  if (response.status() === 404) throw new PendingReadbackError();
  expect(response.status(), 'Authoritative task readback status').toBe(200);
  return (await response.json() as { data: T }).data;
}
async function created<T>(api: APIRequestContext, route: string, data: object): Promise<T> {
  const response = await api.post(route, { data }); expect(response.status(), 'Owned task fixture create status').toBe(200);
  return (await response.json() as { data: T }).data;
}
async function poll(verify: () => Promise<boolean>) {
  let pending: Error | undefined;
  try {
    await expect.poll(async () => {
      try {
        const reflected = await verify();
        pending = reflected ? undefined : new Error('Owned task mutation is not reflected in the successful readback yet.');
        return reflected;
      } catch (error) {
        if (!(error instanceof PendingReadbackError)) { pending = undefined; throw error; }
        pending = error; return false;
      }
    }, { timeout: 20_000, intervals: [100, 250, 500], message: 'Authoritative task mutation readback' }).toBe(true);
  } catch (error) {
    if (pending) throw new Error('Owned task mutation readback deadline exceeded.', { cause: pending });
    throw error;
  }
}
async function safeDelete(api: APIRequestContext, route: string) {
  expect((await api.delete(route)).status(), 'Owned task fixture delete status').toBe(200);
}

async function openModal(context: Context, trigger: Locator, name: string) {
  const { page, observation: observation } = context; const dialog = page.getByRole('dialog', { name, exact: true });
  await observation.enter(trigger, 'open-modal'); await expect(dialog).toBeVisible(); await observation.escape();
  await observation.keyboardCheck('escape-closes-modal', async () => {
    await expect(dialog).toBeHidden({ timeout: 1500 }); return true;
  });
  await observation.keyboardCheck('escape-restores-trigger-focus', async () => {
    await expect(trigger).toBeFocused({ timeout: 1500 }); return true;
  });
  if (await dialog.isVisible()) await observation.enter(dialog.getByRole('button', { name: '취소', exact: true }));
  await observation.enter(trigger, 'open-modal'); await expect(dialog).toBeVisible(); return dialog;
}
async function dirtyEscape(context: Context, trigger: Locator, dialog: Locator, field: Locator, value: string) {
  const { page, observation } = context;
  await observation.fill(field, value); await observation.escape();
  const confirmation = page.getByRole('dialog', { name: '저장하지 않은 변경', exact: true });
  const warned = await confirmation.waitFor({ state: 'visible', timeout: 1500 }).then(() => true, () => false);
  observation.measurement.keyboard.checks.push({ check: 'dirty-escape-asks-before-discard', passed: warned });
  if (warned) await observation.enter(confirmation.getByRole('button', { name: '계속 편집', exact: true }), 'continue-editing');
  await observation.keyboardCheck('dirty-escape-preserves-input', async () => {
    await expect(dialog).toBeVisible({ timeout: 1500 }); await expect(field).toHaveValue(value, { timeout: 1500 }); return true;
  });
  // A failed close guard remains a failed sample; recreate input to finish measuring the real task.
  if (await dialog.isHidden()) { await observation.enter(trigger, 'open-modal'); await expect(dialog).toBeVisible(); await observation.fill(field, value); }
}
async function confirmDelete(context: Context, trigger: Locator, confirmText = '삭제') {
  const { page, observation } = context;
  await observation.enter(trigger, 'confirm-open'); const confirmation = page.getByRole('dialog'); await expect(confirmation).toBeVisible();
  await observation.escape();
  await observation.keyboardCheck('escape-cancels-destructive-confirmation', async () => {
    await expect(confirmation).toBeHidden({ timeout: 1500 }); return true;
  });
  await observation.keyboardCheck('confirmation-restores-trigger-focus', async () => {
    await expect(trigger).toBeFocused({ timeout: 1500 }); return true;
  });
  if (await confirmation.isVisible()) await observation.enter(confirmation.getByRole('button', { name: '취소', exact: true }), 'confirm-cancel');
  await observation.enter(trigger, 'confirm-open'); await expect(confirmation).toBeVisible();
  return confirmation.getByRole('button', { name: confirmText, exact: true });
}

async function userWorkflow(context: Context): Promise<Workflow> {
  const { page, api, suffix, observation, defer } = context;
  const department = await created<string>(api, DEPARTMENTS, { ognzNm: `Lab User Dept ${suffix}` });
  defer(async () => { await safeDelete(api, `${DEPARTMENTS}/${department}`); });
  const userId = `lab_${suffix}`; const name = `Lab User ${suffix}`; const updated = `${name} Updated`;
  let exists = false;
  defer(async () => { if (exists) await safeDelete(api, `${USERS}/${userId}`); });
  return { route: '/admin/user/manage', ready: () => expect(page.getByRole('heading', { name: '계정 및 사용자 관리', exact: true })).toBeVisible(),
    execute: async () => {
      const trigger = page.getByRole('button', { name: '사용자 등록', exact: true });
      const dialog = await openModal(context, trigger, '신규 사용자 등록'); const nameField = dialog.locator('input[name="userNm"]');
      await dirtyEscape(context, trigger, dialog, nameField, name);
      await observation.fill(dialog.locator('input[name="userId"]'), userId);
      await observation.fill(dialog.locator('input[name="pswd"]'), `Aa1!${randomBytes(16).toString('hex')}`);
      await observation.fill(dialog.locator('input[name="emlAddr"]'), `${userId}@example.invalid`);
      await observation.select(dialog.locator('select[name="ognzId"]'), department);
      await observation.tabTo(dialog.locator('form button[type="submit"]'));
      await observation.action('create', async () => { await observation.enter(dialog.locator('form button[type="submit"]')); exists = true; },
        () => poll(async () => (await read<{ userNm: string }>(api, `${USERS}/${userId}`)).userNm === name));
      await expect(dialog).toBeHidden();
      const search = page.getByRole('textbox', { name: '사용자 검색', exact: true });
      await observation.fill(search, name); await observation.enter(search);
      await observation.enter(page.getByRole('button', { name: `${name} 상세 열기`, exact: true }), 'open-detail');
      await observation.enter(page.getByRole('button', { name: '정보 수정', exact: true }), 'open-modal');
      const edit = page.getByRole('dialog', { name: '사용자 정보 수정', exact: true });
      await expect(edit.locator('input[name="userNm"]')).toHaveValue(name);
      await observation.fill(edit.locator('input[name="userNm"]'), updated);
      await observation.tabTo(edit.locator('form button[type="submit"]'));
      await observation.action('update', () => observation.enter(edit.locator('form button[type="submit"]')),
        () => poll(async () => (await read<{ userNm: string }>(api, `${USERS}/${userId}`)).userNm === updated));
      await expect(edit).toBeHidden(); await observation.fill(search, updated); await observation.enter(search);
      await observation.enter(page.getByRole('button', { name: `${updated} 상세 열기`, exact: true }), 'open-detail');
      const confirm = await confirmDelete(context, page.getByRole('button', { name: '사용자 삭제', exact: true }));
      await observation.tabTo(confirm);
      await observation.action('delete', () => observation.enter(confirm), () => poll(async () => (await api.get(`${USERS}/${userId}`)).status() === 404));
      exists = false;
    } };
}

async function departmentWorkflow(context: Context): Promise<Workflow> {
  const { page, api, suffix, observation, defer } = context; const prefix = `LabDept${suffix}`;
  const ids: string[] = [];
  for (const name of [`${prefix} A`, `${prefix} B`]) ids.push(await created<string>(api, DEPARTMENTS, { ognzNm: name }));
  const rows = (await read<{ list: { ognzId: string; ognzNm: string }[] }>(api, `${DEPARTMENTS}?keyword=${prefix}&page=0&size=10`)).list;
  expect(rows).toHaveLength(2); const child = rows[0]; const parent = rows[1]; let childExists = true;
  defer(async () => { if (childExists) await safeDelete(api, `${DEPARTMENTS}/${child.ognzId}`); await safeDelete(api, `${DEPARTMENTS}/${parent.ognzId}`); });
  return { route: '/admin/user/departments', ready: () => expect(page.getByRole('heading', { name: '부서 및 조직 관리', exact: true })).toBeVisible(),
    execute: async () => {
      const search = page.getByRole('textbox', { name: '부서 검색', exact: true });
      await observation.fill(search, prefix); await observation.enter(search);
      await observation.enter(page.locator('[data-a2-master-item]', { hasText: child.ognzNm }));
      const editTrigger = page.getByRole('button', { name: '정보 수정', exact: true });
      const dialog = await openModal(context, editTrigger, '부서 정보 수정'); const name = `${child.ognzNm} Edited`;
      await dirtyEscape(context, editTrigger, dialog, dialog.locator('input[name="ognzNm"]'), name);
      await observation.tabTo(dialog.locator('form button[type="submit"]'));
      await observation.action('update', () => observation.enter(dialog.locator('form button[type="submit"]')),
        () => poll(async () => (await read<{ ognzNm: string }>(api, `${DEPARTMENTS}/${child.ognzId}`)).ognzNm === name));
      await expect(dialog).toBeHidden();
      await observation.enter(page.locator('[data-a2-master-item]', { hasText: name }));
      const placement = page.getByRole('region', { name: '부서 자리 바꾸기' });
      await observation.select(placement.getByRole('combobox', { name: '상위 부서', exact: true }), parent.ognzId);
      await observation.enter(placement.getByRole('button', { name: '상위 부서로 옮기기', exact: true }));
      const save = page.getByRole('button', { name: '조직 계층 저장', exact: true }); await expect(save).toBeEnabled();
      await observation.tabTo(save);
      await observation.action('reparent', () => observation.enter(save),
        () => poll(async () => (await read<{ upOgnzId: string }>(api, `${DEPARTMENTS}/${child.ognzId}`)).upOgnzId === parent.ognzId));
      await observation.enter(page.locator('[data-a2-master-item]', { hasText: name }));
      const confirm = await confirmDelete(context, page.getByRole('button', { name: '부서 삭제', exact: true }));
      await observation.tabTo(confirm);
      await observation.action('delete', () => observation.enter(confirm), () => poll(async () => (await api.get(`${DEPARTMENTS}/${child.ognzId}`)).status() === 404));
      childExists = false;
    } };
}

async function boardWorkflow(context: Context): Promise<Workflow> {
  const { page, api, suffix, observation, defer } = context; const board = 'BBSMSTR_AAAAAAAAAAAA';
  const metadata = await read<{ bbsTtl: string }>(api, `/api/v1/boards/${board}/meta`);
  const title = `Lab Article ${suffix}`; const updated = `${title} Updated`; let post: number | null = null;
  defer(async () => { if (post !== null) await safeDelete(api, `/api/v1/boards/${board}/posts/${post}`); });
  const locate = async (name: string) => {
    const rows = (await read<{ list: { pstSn: number; pstTtl: string }[] }>(api, `/api/v1/boards/${board}?searchCnd=0&searchWrd=${encodeURIComponent(name)}&page=0&size=20`)).list;
    const found = rows.filter(row => row.pstTtl === name); if (found.length === 1) post = found[0].pstSn; return found.length === 1;
  };
  const openSavedArticle = async (name: string, toast: string) => {
    await expect(page.locator('[data-sonner-toast]', { hasText: toast })).toBeVisible();
    await page.waitForURL(url => !url.pathname.includes('insert-board-article'), { waitUntil: 'domcontentloaded' });
    await page.goto(`/admin/community/boards/select-board-list?bbsId=${board}&searchCnd=0&searchWrd=${encodeURIComponent(name)}`);
    await observation.enter(page.locator(`a[href*="pstSn=${post}"]`, { hasText: name }).filter({ visible: true }).first());
    await expect(page).toHaveURL(/\/boards\/detail\?/);
  };
  return { route: `/admin/community/boards/select-board-list?bbsId=${board}`, ready: async () => {
    await expect(page.getByRole('heading', { name: metadata.bbsTtl, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '글쓰기', exact: true })).toBeVisible();
  },
    execute: async () => {
      await observation.enter(page.getByRole('button', { name: '글쓰기', exact: true }));
      await observation.fill(page.locator('input[name="pstTtl"]'), title);
      await observation.fill(page.locator('.ProseMirror'), '합성 게시글 내용');
      const save = page.getByRole('button', { name: '게시글 등록', exact: true }); await observation.tabTo(save);
      await observation.action('create', () => observation.enter(save), () => poll(() => locate(title)));
      await openSavedArticle(title, '게시글을 등록했습니다.');
      await observation.enter(page.getByRole('button', { name: '게시글 수정', exact: true }));
      await expect(page.locator('input[name="pstTtl"]')).toHaveValue(title);
      await observation.fill(page.locator('input[name="pstTtl"]'), updated);
      const editSave = page.getByRole('button', { name: '게시글 수정', exact: true }); await observation.tabTo(editSave);
      await observation.action('update', () => observation.enter(editSave),
        () => poll(async () => (await read<{ pstTtl: string }>(api, `/api/v1/boards/${board}/posts/${post}`)).pstTtl === updated));
      await openSavedArticle(updated, '게시글을 수정했습니다.');
      const confirm = await confirmDelete(context, page.getByRole('button', { name: '게시글 삭제', exact: true })); await observation.tabTo(confirm);
      await observation.action('delete', () => observation.enter(confirm), () => poll(async () => {
        const deleted = await read<{ pstSn: number; useYn: string }>(api, `/api/v1/boards/${board}/posts/${post}?countView=false`);
        const active = await read<{ list: { pstSn: number }[] }>(api, `/api/v1/boards/${board}?searchCnd=0&searchWrd=${encodeURIComponent(updated)}&page=0&size=20`);
        return deleted.pstSn === post && deleted.useYn === 'N' && active.list.every(row => row.pstSn !== post);
      }));
      post = null;
    } };
}

async function approvalWorkflow(context: Context): Promise<Workflow> {
  const { page, api, suffix, observation, defer, baseURL, actorPage } = context;
  const approver = await createVisualAdmin(api, baseURL); defer(approver.dispose);
  const code = `LAB${suffix.slice(0, 8).toUpperCase()}`; const taskName = `Lab Task ${suffix}`;
  await created(api, '/api/v1/admin/system/codes/detail', { cdId: 'COM075', dtlCd: code, dtlCdNm: taskName, dtlCdExpln: '격리 과업 검증', useYn: 'Y' });
  const title = `Lab Approval ${suffix}`;
  return { route: '/approvals', ready: () => expect(page.getByRole('heading', { name: '결재 허브', exact: true })).toBeVisible(),
    execute: async () => {
      const trigger = page.getByRole('button', { name: '새 결재 기안', exact: true });
      const dialog = await openModal(context, trigger, '새 결재 기안');
      await dirtyEscape(context, trigger, dialog, dialog.getByLabel('제목 (필수)'), title);
      await observation.fill(dialog.getByLabel('본문 (선택)'), '합성 결재 내용');
      await observation.enter(dialog.locator('#approval-draft-task-type'));
      const option = page.getByRole('option', { name: taskName, exact: true });
      for (let index = 0; index < 80 && !await option.evaluate(element => element === document.activeElement); index++) await page.keyboard.press('ArrowDown');
      expect(await option.evaluate(element => element === document.activeElement), 'Keyboard task-code option focus').toBe(true);
      await page.keyboard.press('Enter'); observation.measurement.keyboard.enters += 1;
      await observation.enter(dialog.getByRole('button', { name: '다음', exact: true }));
      await observation.enter(dialog.getByRole('button', { name: '1단계 결재자 선택', exact: true }));
      const picker = page.getByRole('dialog', { name: '결재자 검색 및 선택', exact: true });
      await observation.fill(picker.getByLabel('사용자 검색어 입력'), '최고관리자');
      await observation.enter(picker.getByRole('button', { name: '검색', exact: true }));
      const candidate = picker.getByRole('button', { name: '사용자 선택: 최고관리자', exact: true })
        .filter({ has: page.getByText(`ID: ${approver.esntlId}`, { exact: true }) });
      await observation.enter(candidate); await expect(picker).toBeHidden();
      await observation.enter(dialog.getByRole('button', { name: '다음', exact: true }));
      const submit = dialog.getByRole('button', { name: '결재 상신', exact: true }); await observation.tabTo(submit);
      let approval = 0;
      await observation.action('submit', () => observation.enter(submit), () => poll(async () => {
        const rows = await read<{ list: { ifmlAtrzSn: number; docTtl: string }[] }>(api, `/api/v1/approvals/my?keyword=${encodeURIComponent(title)}&page=0&size=100`);
        const owned = rows.list.filter(row => row.docTtl === title); if (owned.length === 1) approval = owned[0].ifmlAtrzSn;
        return approval > 0;
      }));
      await expect(dialog).toBeHidden();
      const { page: approverPage, guard: approverGuard } = await actorPage({ storageState: approver.storageState, ...LAB_CONTEXT });
      context.guards.push(approverGuard);
      const actorObservation = new EnterpriseObservation(approverPage, observation.measurement.cache, observation.measurement.iteration);
      observation.includeActor(actorObservation); await actorObservation.prepare();
      await actorObservation.navigate('/approvals', () => expect(approverPage.getByRole('heading', { name: '결재 허브', exact: true })).toBeVisible());
      await actorObservation.enter(approverPage.getByRole('button', { name: `${title} #${approval} 상세 열기`, exact: true }), 'open-detail');
      const opinion = '합성 충돌 복구 의견';
      const opinionField = approverPage.getByRole('textbox', { name: '결재 의견 (반려 시 필수)', exact: true });
      await actorObservation.fill(opinionField, opinion);
      await actorObservation.enter(approverPage.getByRole('button', { name: '결재 승인', exact: true }), 'confirm-open');
      const confirm = approverPage.getByRole('dialog').getByRole('button', { name: '확인', exact: true }); await actorObservation.tabTo(confirm);
      const { page: normalApproverPage, guard: normalApproverGuard } = await actorPage({ storageState: approver.storageState, ...LAB_CONTEXT });
      context.guards.push(normalApproverGuard);
      const normalObservation = new EnterpriseObservation(normalApproverPage, observation.measurement.cache, observation.measurement.iteration);
      observation.includeActor(normalObservation); await normalObservation.prepare();
      await normalObservation.navigate('/approvals', () => expect(normalApproverPage.getByRole('heading', { name: '결재 허브', exact: true })).toBeVisible());
      await normalObservation.enter(normalApproverPage.getByRole('button', { name: `${title} #${approval} 상세 열기`, exact: true }), 'open-detail');
      await normalObservation.fill(normalApproverPage.getByRole('textbox', { name: '결재 의견 (반려 시 필수)', exact: true }), '합성 선행 처리');
      await normalObservation.enter(normalApproverPage.getByRole('button', { name: '결재 승인', exact: true }), 'confirm-open');
      const normalConfirm = normalApproverPage.getByRole('dialog').getByRole('button', { name: '확인', exact: true });
      await normalObservation.tabTo(normalConfirm);
      const succeeded = normalApproverPage.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/approvals/${approval}/confirm`
        && response.request().method() === 'PUT');
      await observation.action('approve', () => normalObservation.enter(normalConfirm, 'approve'), async () => {
        expect((await succeeded).status()).toBe(200);
        await poll(async () => (await read<{ aprvYn: string }>(api, `/api/v1/approvals/${approval}`)).aprvYn === 'C');
      });
      await expect(normalApproverPage.locator('[data-sonner-toast]', { hasText: '성공적으로 승인되었습니다.' })).toBeVisible();
      approverGuard.expectErrors([{ id: 'E2E-LAB-APPROVAL-CONFLICT', specScope: context.scope, channel: 'response',
        urlPattern: new RegExp(`/api/v1/approvals/${approval}/confirm$`), method: 'PUT', status: 409,
        messagePattern: null, minOccurrences: 1, maxOccurrences: 1,
        reason: '동일 결재자의 선행 승인 뒤 실제 낡은 화면 요청이 409인지 확인한다.', expiresAt: '2026-12-31' }]);
      const conflict = approverPage.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/approvals/${approval}/confirm`
        && response.request().method() === 'PUT' && response.status() === 409);
      await observation.action('recover-conflict', () => actorObservation.enter(confirm, 'recover-conflict'), async () => {
        await conflict;
        await poll(async () => (await read<{ aprvYn: string }>(api, `/api/v1/approvals/${approval}`)).aprvYn === 'C');
      });
      await expect(approverPage.getByRole('alert').filter({ hasText: '입력한 의견은 유지됩니다.' })).toBeVisible();
      await actorObservation.keyboardCheck('approval-conflict-preserves-opinion-and-document', async () => {
        await expect(opinionField).toHaveValue(opinion);
        await expect(approverPage.getByRole('region', { name: '문서 내용', exact: true })).toContainText(title); return true;
      });
      const refresh = approverPage.getByRole('button', { name: '최신 문서 확인', exact: true }); await expect(refresh).toBeEnabled();
      const latest = approverPage.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/approvals/${approval}`
        && response.request().method() === 'GET' && response.status() === 200);
      await actorObservation.enter(refresh); expect((await (await latest).json()).data.aprvYn).toBe('C');
      await expect(opinionField).toHaveValue(opinion); await expect(opinionField).toHaveAttribute('readonly', '');
      await expect(approverPage.getByRole('button', { name: '결재 승인', exact: true })).toBeHidden();
      // Immutable approval history is retained only inside the disposable task database.
    } };
}

async function reportWorkflow(context: Context): Promise<Workflow> {
  const { page, api, suffix, observation, defer } = context; const title = `Lab Report ${suffix}`; const updated = `${title} Updated`;
  let id: number | null = null; const model = new DeptJobPage(page);
  defer(async () => { if (id !== null) await safeDelete(api, `/api/v1/work-reports/${id}`); });
  return { route: '/smart-toolkit/work-report?e2e=true', ready: async () => {
    await expect(page.getByRole('heading', { name: '업무 보고', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: '업무 보고', exact: true })).toHaveAttribute('aria-selected', 'true');
  },
    execute: async () => {
      const trigger = page.getByRole('button', { name: '보고 등록', exact: true });
      const dialog = await openModal(context, trigger, '업무 보고 등록');
      await dirtyEscape(context, trigger, dialog, dialog.locator('input[name="rptTtl"]'), title);
      await observation.fill(dialog.locator('textarea[name="rptCn"]'), '합성 업무 보고');
      const submit = dialog.getByRole('button', { name: '보고 등록', exact: true }); await observation.tabTo(submit);
      await observation.action('create', () => observation.enter(submit), () => poll(async () => {
        const rows = (await read<{ list: { rptpSn: number; rptTtl: string }[] }>(api, `/api/v1/work-reports?searchKeyword=${encodeURIComponent(title)}&pageIndex=1&pageUnit=10`)).list;
        const owned = rows.filter(row => row.rptTtl === title); if (owned.length === 1) id = owned[0].rptpSn; return id !== null;
      }));
      await expect(dialog).toBeHidden(); await observation.fill(model.searchInput, title); await observation.enter(model.searchInput);
      await observation.enter(model.rowEditButton(title)); const edit = page.getByRole('dialog', { name: '업무 보고 수정', exact: true });
      await expect(edit.locator('input[name="rptTtl"]')).toHaveValue(title); await observation.fill(edit.locator('input[name="rptTtl"]'), updated);
      const save = edit.getByRole('button', { name: '수정 저장', exact: true }); await observation.tabTo(save);
      await observation.action('update', () => observation.enter(save), () => poll(async () => (await read<{ rptTtl: string }>(api, `/api/v1/work-reports/${id}`)).rptTtl === updated));
      await expect(edit).toBeHidden(); await observation.fill(model.searchInput, updated); await observation.enter(model.searchInput);
      const ownedDeletePath = `/api/v1/work-reports/${id}`;
      context.guard.expectErrors([{ id: 'E2E-LAB-REPORT-DELETE-FAILURE', specScope: context.scope, channel: 'response',
        urlPattern: new RegExp(`${ownedDeletePath}$`), method: 'DELETE', status: 500, messagePattern: null,
        minOccurrences: 1, maxOccurrences: 1, reason: '소유 보고서 한 건의 삭제 실패 후 행과 재시도 상태를 검증한다.', expiresAt: '2026-12-31' }]);
      let injected = 0;
      const ownedDelete = (url: URL) => url.pathname === ownedDeletePath;
      await page.route(ownedDelete, async route => {
        if (route.request().method() === 'DELETE' && injected === 0) {
          injected += 1; await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false }) });
        } else await route.continue();
      });
      await observation.reapplyCacheMode();
      const failedConfirm = await confirmDelete(context, model.rowDeleteButton(updated)); await observation.enter(failedConfirm);
      await expect(page.locator('[data-sonner-toast]', { hasText: '업무 보고 삭제 중 오류가 발생했습니다.' })).toBeVisible();
      expect(injected).toBe(1); await expect(model.row(updated)).toBeVisible();
      await expect(model.rowDeleteButton(updated)).toBeEnabled(); await expect(model.rowDeleteButton(updated)).not.toHaveAttribute('aria-busy', 'true');
      expect((await read<{ rptTtl: string }>(api, ownedDeletePath)).rptTtl).toBe(updated);
      await page.unroute(ownedDelete);
      await observation.reapplyCacheMode();
      const confirm = await confirmDelete(context, model.rowDeleteButton(updated)); await observation.tabTo(confirm);
      await observation.action('delete', () => observation.enter(confirm), () => poll(async () => (await api.get(ownedDeletePath)).status() === 404));
      id = null;
    } };
}

async function scheduleWorkflow(context: Context): Promise<Workflow> {
  const { page, api, suffix, observation, defer } = context; const title = `Lab Schedule ${suffix}`; const updated = `${title} Updated`;
  const yearMonth = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit' }).format(new Date()).replaceAll('-', '');
  let id: number | null = null;
  defer(async () => { if (id !== null) await safeDelete(api, `/api/v1/schedules/${id}`); });
  return { route: '/smart-toolkit/schedule?e2e=true', ready: async () => {
    await expect(page.getByRole('heading', { name: '일정', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: '일정', exact: true })).toHaveAttribute('aria-selected', 'true');
  },
    execute: async () => {
      const trigger = page.getByRole('button', { name: '일정 등록', exact: true }); const dialog = await openModal(context, trigger, '일정 등록');
      await dirtyEscape(context, trigger, dialog, dialog.locator('input[name="schdlNm"]'), title);
      const submit = dialog.locator('form button[type="submit"]'); await observation.tabTo(submit);
      await observation.action('create', () => observation.enter(submit), () => poll(async () => {
        const rows = await read<{ schdlSn: number; schdlNm: string }[]>(api, `/api/v1/schedules/monthly?yearMonth=${yearMonth}`);
        const owned = rows.filter(row => row.schdlNm === title); if (owned.length === 1) id = owned[0].schdlSn; return id !== null;
      }));
      await expect(dialog).toBeHidden();
      await observation.enter(page.locator('tr', { hasText: title }).getByTestId('schedule-edit'));
      const edit = page.getByRole('dialog', { name: '일정 수정', exact: true });
      await expect(edit.locator('input[name="schdlNm"]')).toHaveValue(title); await observation.fill(edit.locator('input[name="schdlNm"]'), updated);
      const save = edit.locator('form button[type="submit"]'); await observation.tabTo(save);
      await observation.action('update', () => observation.enter(save), () => poll(async () => (await read<{ schdlNm: string }>(api, `/api/v1/schedules/${id}`)).schdlNm === updated));
      await expect(edit).toBeHidden(); const confirm = await confirmDelete(context, page.locator('tr', { hasText: updated }).getByTestId('schedule-delete')); await observation.tabTo(confirm);
      await observation.action('delete', () => observation.enter(confirm), () => poll(async () => {
        const rows = await read<{ schdlSn: number }[]>(api, `/api/v1/schedules/monthly?yearMonth=${yearMonth}`); return rows.every(row => row.schdlSn !== id);
      })); id = null;
    } };
}

async function surveyWorkflow(context: Context): Promise<Workflow> {
  const { page, api, suffix, observation, defer, actorPage } = context;
  const userId = `lab_sr_${suffix}`; const password = `Aa1!${randomBytes(16).toString('hex')}`;
  await created(api, USERS, { userId, userNm: 'Lab Survey Respondent', pswd: password, role: 'USER' });
  defer(async () => {
    await page.goto('about:blank');
    await expect.poll(async () => (await api.delete(`${USERS}/${userId}`)).status(), { timeout: 5000, intervals: [250] }).toBe(200);
  });
  const respondent = await read<{ userId: string; crtDt: string; esntlId: string }>(api, `${USERS}/${userId}`);
  expect(respondent.userId).toBe(userId); expect(Number.isFinite(Date.parse(respondent.crtDt))).toBe(true);
  const groups = await read<{ complete: boolean; groups: string[] }>(api, `/api/v1/admin/authorization/users/${respondent.esntlId}/groups`);
  expect(groups.complete).toBe(true); expect(groups.groups).toEqual(['ROLE_USER']);
  const login = await page.context().request.post('/api/v1/auth/login', { data: { userId, password } }); expect(login.status()).toBe(200);
  expect(Object.hasOwn((await login.json()).data ?? {}, 'accessToken')).toBe(false);
  const templateCode = `LAB${suffix.slice(0, 9).toUpperCase()}`;
  await created(api, `${SURVEYS}/templates`, { srvyTmpltTypeCd: templateCode, srvyTmpltExpln: '격리 설문 과업' });
  const templates = await read<{ list: { srvyTmpltSn: number; srvyTmpltTypeCd: string }[] }>(api, `${SURVEYS}/templates?keyword=${templateCode}&page=0&size=10`);
  const template = templates.list.find(row => row.srvyTmpltTypeCd === templateCode)!; expect(template).toBeTruthy();
  defer(async () => { await safeDelete(api, `${SURVEYS}/templates/${template.srvyTmpltSn}`); });
  const title = `Lab Survey ${suffix}`; const year = new Date().getUTCFullYear();
  await created(api, SURVEYS, { srvyTtl: title, srvyTmpltSn: template.srvyTmpltSn, srvyBgngYmd: `${year - 1}0101`, srvyEndYmd: `${year + 1}1231` });
  const surveys = await read<{ list: { srvySn: number; srvyTtl: string }[] }>(api, `${SURVEYS}?keyword=${encodeURIComponent(title)}&page=0&size=10`);
  const survey = surveys.list.find(row => row.srvyTtl === title)!; expect(survey).toBeTruthy();
  defer(async () => { await safeDelete(api, `${SURVEYS}/${survey.srvySn}`); });
  const choices: { question: number; item: number; label: string }[] = [];
  for (let index = 1; index <= 2; index++) {
    const questionText = `과업 문항 ${index} ${suffix}`; const label = `과업 답변 ${index} ${suffix}`;
    await created(api, `${SURVEYS}/${survey.srvySn}/questions`, { qstnTypeCd: '1', qstnCn: questionText, maxChcCnt: 1 });
    const questions = await read<{ srvyQstnSn: number; qstnCn: string; items: { srvyArtclSn: number; artclCn: string }[] }[]>(api, `${SURVEYS}/${survey.srvySn}/questions`);
    const question = questions.find(row => row.qstnCn === questionText)!; expect(question).toBeTruthy();
    await created(api, `${SURVEYS}/questions/${question.srvyQstnSn}/items`, { artclSn: 1, artclCn: label, etcAnsYn: 'N' });
    await created(api, `${SURVEYS}/questions/${question.srvyQstnSn}/items`, { artclSn: 2, artclCn: `미선택 ${index} ${suffix}`, etcAnsYn: 'N' });
    const populated = (await read<typeof questions>(api, `${SURVEYS}/${survey.srvySn}/questions`)).find(row => row.srvyQstnSn === question.srvyQstnSn)!;
    choices.push({ question: question.srvyQstnSn, item: populated.items.find(row => row.artclCn === label)!.srvyArtclSn, label });
  }
  const released = await api.put(`${SURVEYS}/${survey.srvySn}`, { data: { srvyTtl: title, srvyTmpltSn: template.srvyTmpltSn,
    srvyBgngYmd: `${year - 1}0101`, srvyEndYmd: `${year + 1}1231`, rlsYn: 'Y' } }); expect(released.status()).toBe(200);
  const ownedResponses = async () => {
    const rows = (await read<{ list: { srvyRspnsSn: number; srvySn: number; srvyQstnSn: number; srvyArtclSn: number; rspdntAnsCn: string }[] }>(api, `${RESPONSES}?page=0&size=100`)).list;
    return rows.filter(row => row.srvySn === survey.srvySn);
  };
  return { route: '/survey', ready: () => expect(page.getByRole('heading', { name: '온라인 설문 조사', exact: true })).toBeVisible(),
    execute: async () => {
      const current = await page.evaluate(async () => (await (await fetch('/api/v1/auth/me', { cache: 'no-store' })).json()).data as { id: string; permissions: string[] });
      expect(current.id).toBe(userId); expect(current.permissions).not.toContain('SURVEY_READ_ALL');
      await observation.enter(page.getByRole('button', { name: `${title} 설문 응답 열기`, exact: true }));
      for (const choice of choices) { await observation.tabTo(page.getByRole('radio', { name: choice.label, exact: true })); await page.keyboard.press('Space'); }
      const submit = page.getByRole('button', { name: '응답 제출', exact: true }); await observation.tabTo(submit);
      await observation.action('respond', () => observation.enter(submit), () => poll(async () => {
        const rows = await ownedResponses(); return rows.length === 2 && choices.every(choice => rows.some(row => row.srvyQstnSn === choice.question && row.srvyArtclSn === choice.item && row.rspdntAnsCn === choice.label));
      })); await expect(page.getByRole('button', { name: '제출 완료', exact: true })).toBeDisabled();
      const rows = await ownedResponses(); const { page: adminPage, guard: adminGuard } = await actorPage({ storageState: 'playwright/.auth/admin.json', ...LAB_CONTEXT });
      context.guards.push(adminGuard);
      const adminObservation = new EnterpriseObservation(adminPage, observation.measurement.cache, observation.measurement.iteration);
      observation.includeActor(adminObservation); await adminObservation.prepare();
      await adminObservation.navigate('/survey/response', () => expect(adminPage.getByRole('heading', { name: '설문조사 응답 관리', exact: true })).toBeVisible());
      const row = adminPage.getByRole('row').filter({ has: adminPage.locator(`a[href="/survey/response/${rows[0].srvyRspnsSn}"]`) });
      const adminContext = { ...context, page: adminPage, observation: adminObservation };
      const confirm = await confirmDelete(adminContext, row.getByRole('button', { name: /전체 제출 취소$/ }), '전체 제출 취소'); await adminObservation.tabTo(confirm);
      await observation.action('cancel', () => adminObservation.enter(confirm, 'cancel'), () => poll(async () => (await ownedResponses()).length === 0));
      await page.goto(`/survey/${survey.srvySn}`);
      for (const choice of choices) { await observation.tabTo(page.getByRole('radio', { name: choice.label, exact: true })); await page.keyboard.press('Space'); }
      await observation.tabTo(submit);
      await observation.action('respond', () => observation.enter(submit), () => poll(async () => (await ownedResponses()).length === 2));
    } };
}

const workflows: Record<EnterpriseTask, (context: Context) => Promise<Workflow>> = {
  'user-management': userWorkflow, 'department-hierarchy': departmentWorkflow, 'board-article': boardWorkflow,
  approvals: approvalWorkflow, survey: surveyWorkflow, 'work-report': reportWorkflow, schedule: scheduleWorkflow,
};
const seedCounts: Record<EnterpriseTask, Record<string, number>> = {
  'user-management': { departments: 1 }, 'department-hierarchy': { departments: 2 },
  'board-article': { existingProtectedBoards: 1, ownedInitialPosts: 0 }, approvals: { taskCodes: 1, approvers: 1 },
  survey: { ordinaryRespondents: 1, templates: 1, surveys: 1, questions: 2, items: 4 },
  'work-report': { ownedInitialReports: 0 }, schedule: { ownedInitialSchedules: 0 },
};
const playwrightVersion = (createRequire(__filename)('@playwright/test/package.json') as { version: string }).version;
const diagnostic = process.env.E2E_ENTERPRISE_LAB_DIAGNOSTIC === 'true';
const cacheModes: readonly CacheMode[] = diagnostic ? ['cold'] : ['cold', 'warm'];

for (const task of ENTERPRISE_TASKS) for (const cache of cacheModes) for (let iteration = 1; iteration <= (diagnostic ? 1 : 3); iteration++) {
  test(`${task} ${cache} ${iteration}`, async ({ actorPage, adminRequest, baseURL, browser }, testInfo) => {
    const target = await assertIsolatedTarget(); const cleanups: (() => Promise<void>)[] = [];
    const { page, guard } = await actorPage({ storageState: 'playwright/.auth/admin.json', ...LAB_CONTEXT });
    const guards = [guard];
    const observation = new EnterpriseObservation(page, cache as CacheMode, iteration);
    observation.measurement.runtime = { browserVersion: browser.version(), nodeVersion: process.version, playwrightVersion };
    let failure: unknown;
    const fail = (stage: string, error: unknown) => {
      if (failure === undefined) { failure = error; observation.measurement.failureStage = stage; }
      observation.measurement.outcome = 'failed';
    };
    try {
      const context: Context = { page, observation, api: adminRequest, baseURL: baseURL!, actorPage,
        suffix: randomBytes(6).toString('hex'), guard, guards, scope: buildSpecScope(testInfo.file, testInfo.title),
        defer: cleanup => { cleanups.push(cleanup); } };
      const workflow = await workflows[task](context); await observation.prepare();
      observation.measurement.fixture = { primaryActor: task === 'survey' ? 'ordinary-user' : 'administrator',
        secondaryActors: task === 'approvals' ? 2 : task === 'survey' ? 1 : 0, ownedSeedCounts: seedCounts[task] };
      await observation.navigate(workflow.route, workflow.ready); await workflow.execute();
      observation.measurement.failureStage = 'metrics'; await observation.finish();
      expect(observation.measurement.lcpMs, 'Landing LCP must be observed').not.toBeNull();
      expect(observation.measurement.cls, 'Supported layout-shift observation must complete').not.toBeNull();
      expect(observation.measurement.observedLabInteractionMs, 'Actual task interactions must be observed').not.toBeNull();
      expect(observation.measurement.lcpMs!).toBeLessThanOrEqual(2500); expect(observation.measurement.cls!).toBeLessThanOrEqual(0.1);
      expect(observation.measurement.observedLabInteractionMs!).toBeLessThanOrEqual(200);
      expect(observation.measurement.taskActionToAuthoritativeReadbackMs.length).toBeGreaterThan(0);
      expect(observation.measurement.keyboard.tabs).toBeGreaterThan(0); expect(observation.measurement.keyboard.enters).toBeGreaterThan(0);
      expect(observation.measurement.keyboard.escapes).toBeGreaterThan(0);
      expect(observation.measurement.keyboard.checks.length).toBeGreaterThan(0);
      expect(observation.measurement.keyboard.checks.every(check => check.passed), 'Every keyboard close/focus/preservation check').toBe(true);
      if (cache === 'cold') expect(observation.measurement.cdp.cacheHits).toBe(0);
      else expect(observation.measurement.cdp.cacheHits, 'Warm reload must produce actual cache observations').toBeGreaterThan(0);
      expect(observation.measurement.actorPages).toHaveLength(observation.measurement.fixture.secondaryActors);
      for (const actor of observation.measurement.actorPages) {
        expect(actor.cdp.actualPage && actor.cdp.cpuApplied && actor.cdp.networkApplied, 'Every secondary page must receive its own CDP profile').toBe(true);
        expect(actor.cdp.cacheDisabled).toBe(cache === 'cold');
        if (cache === 'cold') expect(actor.cdp.cacheHits).toBe(0);
        else expect(actor.cdp.cacheHits, 'Every warm secondary reload must actually use cache').toBeGreaterThan(0);
        expect(actor.observedInteractionCount).toBeGreaterThan(0);
        expect(actor.observedLabInteractionMs, 'Every secondary actor must have actual EventTiming or first-input observations').not.toBeNull();
      }
    } catch (error) {
      fail(observation.measurement.failureStage ?? 'workflow', error);
    } finally {
      if (!observation.measurement.complete) await observation.flush().catch(() => { /* Unobserved metrics remain null. */ });
      // Axe is a separate observation even when workflow or performance assertions are red.
      for (const observed of [observation, ...observation.observedActors()].filter(item => item.measurement.cdp.actualPage)) {
        try {
          const accessibility = await new AxeBuilder({ page: observed.page }).analyze();
          Object.assign(observed.measurement.accessibility, { observed: true, violations: accessibility.violations.map(violation => ({ id: violation.id,
            impact: violation.impact ?? null, nodes: violation.nodes.length })) });
          expect(accessibility.violations.map(violation => violation.id), 'Separate axe stage').toEqual([]);
        } catch (error) { fail('accessibility', error); }
      }
      for (const actorGuard of guards) {
        try { await actorGuard.verify(); } catch (error) { fail('browser-errors', error); }
      }
      for (const cleanup of cleanups.reverse()) {
        try { await cleanup(); } catch { fail('cleanup', new Error('Owned enterprise task cleanup failed.')); }
      }
      if (failure === undefined) { observation.measurement.outcome = 'passed'; observation.measurement.failureStage = null; }
      try { persistTaskMeasurement(task, target.runId, observation.measurement); } finally { await observation.close(); }
    }
    if (failure !== undefined) throw failure;
  });
}
