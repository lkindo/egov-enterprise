'use client';

import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { authorizationAdminService, type AuthorizationHistoryFilters } from '@/services/foundation/system/AuthorizationAdminService';
import type { authorizationHistoryPageSchema } from '@/lib/auth/authorization-management-contract';
import type { z } from 'zod';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { WORK_FILL_REGION_CLASS } from '@/app/components/patterns/work-fill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PagePagination } from '@/components/common/PagePagination';
import { cn } from '@/lib/utils';
import { PermissionScrollRegion } from './PermissionScrollRegion';

const PAGE_SIZE = 20;
/**
 * [2026-10-05 한 화면 압축] 업무 표 행 토큰(카탈로그 §4) — 편집기 '변경 이력' 탭(GroupChangeHistory)과 같은 이력을 조건으로 찾는
 * 허브 '변경 이력' 영역의 표라 같은 행 높이를 쓴다(등재: work-screen-grammar-contract WORK_TABLE_TOKEN_OWNERS). 종전 칸 패딩은
 * 고정 p-3(12px)이라 한 줄 행이 44px, 두 줄로 쌓인 '그룹·사용자' 칸 때문에 65~92px 였다.
 */
const CELL_PAD = 'px-[var(--work-cell-px)] py-[var(--work-cell-py)]';
const HISTORY_COLUMNS = ['시각', '대상', '변경', '그룹·사용자', '권한·필드', '변경 전 → 후', '처리자', '사유'] as const;

/**
 * [2026-09-26 DIP V9] 이력은 사람을 사용자 고유 ID 로만 보였다. 서버가 싣는 이름을 앞에 두고 식별자는 괄호로 남긴다 —
 * 사용자가 삭제돼 이름이 없으면 식별자만 보인다.
 */
export function personLabel(name: string | null, id: string) {
  return name ? `${name} (${id})` : id;
}

/*
 * [2026-10-01] 원시 코드(GROUP_GRANT·ADD 등)와 가공하지 않은 타임스탬프를 사람이 읽는 말로 보인다(공통코드 변경 이력과
 * 같은 용어). 모르는 코드는 원문으로 남겨 새 코드가 생겨도 사라지지 않게 한다.
 */
const TARGET_LABEL: Record<string, string> = { GROUP: '그룹', GROUP_GRANT: '그룹 권한', USER_GROUP: '사용자 배정' };
const CHANGE_LABEL: Record<string, string> = { ADD: '추가', REMOVE: '제거', UPDATE: '변경' };
const GRANT_TYPE_LABEL: Record<string, string> = { OPERATION: '기능 권한', NAVIGATION: '메뉴' };
const FIELD_LABEL: Record<string, string> = { authrt_nm: '그룹 이름', authrt_expln: '그룹 설명' };
const label = (table: Record<string, string>, code: string | null | undefined) => (code ? table[code] ?? code : '');
export function formatChangedAt(value: string) {
  return value ? value.substring(0, 19).replace('T', ' ') : '—';
}

type AuthorizationChange = z.infer<typeof authorizationHistoryPageSchema>['list'][number];

/**
 * 변경 한 줄을 사람이 읽는 문장으로(그룹 편집기의 '변경 이력' 탭이 쓴다, 2026-10-02). 예: '그룹 권한 추가: 기능 권한 BOARD_READ',
 * '사용자 배정 제거: 홍길동 (ESNTL_A)', '그룹 변경: 그룹 이름 (가 → 나)'. 모르는 코드는 원문으로 남긴다.
 */
export function describeChange(change: AuthorizationChange): string {
  const subject = change.targetType === 'USER_GROUP' && change.userId ? personLabel(change.userNm, change.userId)
    : change.grantCode ? `${label(GRANT_TYPE_LABEL, change.grantType)} ${change.grantCode}`.trim()
      : change.field ? label(FIELD_LABEL, change.field) : '';
  const values = change.targetType === 'GROUP' && change.changeType === 'UPDATE' ? ` (${change.before ?? '—'} → ${change.after ?? '—'})` : '';
  return `${label(TARGET_LABEL, change.targetType)} ${label(CHANGE_LABEL, change.changeType)}${subject ? `: ${subject}` : ''}${values}`;
}

/**
 * 권한 관리 허브의 '변경 이력' 영역 — 조건으로 권한 변경 이력을 찾는다(AUTHRT_AUDIT).
 *
 * [2026-10-05 한 화면 압축, 사용자 승인] `fill` 이면 업무면 fill 셸(카탈로그 §4) 안에서 머리·조건·쪽 넘김은 제 높이를 쓰고, 표 상자가
 * 남은 높이를 받아 안쪽에서 스크롤한다(머리글 고정) — 종전에는 표가 높이 제한 없이 늘어 페이지가 970~2,042px 스크롤했다(2차 실측).
 * 표 상자는 권한 표와 같은 이름 있는 스크롤 영역(PermissionScrollRegion)이다 — 이력 표에는 포커스할 요소가 없어, 넘치면 상자 자체가
 * 키보드로 스크롤하는 길이다(WCAG 2.1.1, 종전 상자는 가로로 넘쳐도 키보드로 볼 수 없었다). 제목과 설명은 한 줄, 조건은 넓은 화면에서
 * 한 줄(xl 6칸)이다. 조건 밖(좁은·낮은 화면, 인쇄)에서는 쌓이고, 표 상자는 70vh 상한 안에서 스크롤한다(편집기 이력 탭과 같다).
 */
export function AuthorizationHistory({ initialUserId = '', fill = false }: { initialUserId?: string; fill?: boolean } = {}) {
  const { user } = useAuth();
  const headingId = useId();
  const canAudit = canPermission(user, 'AUTHRT_AUDIT');
  const scope = ['authorization', user?.id, user?.authorizationVersion];
  const [historyPage, setHistoryPage] = useState(1);
  // 사용자 상세에서 넘어오면 그 사람의 로그인 ID 로 조건을 채워 연다(대상 인계, 2026-10-01).
  const [historyInput, setHistoryInput] = useState({ groupCode: '', userId: initialUserId, actorId: '', fromDate: '', toDate: '' });
  const [historyFilters, setHistoryFilters] = useState<AuthorizationHistoryFilters>(initialUserId ? { userId: initialUserId } : {});
  const [historyFilterError, setHistoryFilterError] = useState('');
  const history = useQuery({ queryKey: [...scope, 'history', historyPage, historyFilters], queryFn: () => authorizationAdminService.getHistory(historyPage - 1, PAGE_SIZE, historyFilters), enabled: canAudit, retry: false });
  if (!canAudit) return null;
  const rows = history.data?.list ?? [];
  return (
    <section aria-labelledby={headingId} className={cn('flex flex-col gap-3', fill && WORK_FILL_REGION_CLASS)}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id={headingId} className="font-semibold">권한 변경 이력</h2>
        <p className="text-sm text-muted-foreground">추가·제거 및 변경 전후 값을 보여 줍니다.</p>
      </div>
      {history.error && <p role="alert">{extractErrorMessage(history.error, '이력을 불러오지 못했습니다.')}</p>}
      <form role="search" aria-label="권한 변경 이력 검색" className="grid items-end gap-x-3 gap-y-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" onSubmit={(event) => {
        event.preventDefault();
        if (historyInput.fromDate && historyInput.toDate && historyInput.fromDate > historyInput.toDate) { setHistoryFilterError('시작일은 종료일보다 늦을 수 없습니다.'); return; }
        setHistoryFilterError(''); setHistoryPage(1);
        setHistoryFilters(Object.fromEntries(Object.entries(historyInput).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value.length > 0)));
      }}>
        <label className="space-y-1 text-sm">그룹 코드<Input maxLength={20} value={historyInput.groupCode} onChange={(event) => setHistoryInput((current) => ({ ...current, groupCode: event.target.value }))} /></label>
        <label className="space-y-1 text-sm">대상 사용자 로그인 ID<Input maxLength={20} value={historyInput.userId} onChange={(event) => setHistoryInput((current) => ({ ...current, userId: event.target.value }))} /></label>
        <label className="space-y-1 text-sm">변경자 로그인 ID<Input maxLength={20} value={historyInput.actorId} onChange={(event) => setHistoryInput((current) => ({ ...current, actorId: event.target.value }))} /></label>
        <label className="space-y-1 text-sm">시작일<Input type="date" value={historyInput.fromDate} onChange={(event) => setHistoryInput((current) => ({ ...current, fromDate: event.target.value }))} /></label>
        <label className="space-y-1 text-sm">종료일<Input type="date" value={historyInput.toDate} onChange={(event) => setHistoryInput((current) => ({ ...current, toDate: event.target.value }))} /></label>
        <Button type="submit">이력 조회</Button>
        {historyFilterError && <p role="alert" className="text-sm text-destructive sm:col-span-full">{historyFilterError}</p>}
      </form>
      {history.isPending && <p role="status">변경 이력을 불러오는 중입니다…</p>}
      {rows.length > 0 && (
        <PermissionScrollRegion label="권한 변경 이력 스크롤 영역" fill={fill} scrollPaddingClassName="scroll-pt-8">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">권한 변경 이력</caption>
            <thead className="sticky top-0 z-10 bg-muted"><tr>{HISTORY_COLUMNS.map((title) => <th key={title} scope="col" className={`whitespace-nowrap text-xs font-semibold ${CELL_PAD}`}>{title}</th>)}</tr></thead>
            <tbody>{rows.map((change) => (
              <tr key={change.id} className="border-t border-border">
                <td className={`whitespace-nowrap tabular-nums ${CELL_PAD}`}>{formatChangedAt(change.createdAt)}</td>
                <td className={`whitespace-nowrap ${CELL_PAD}`}>{label(TARGET_LABEL, change.targetType)}</td>
                <td className={`whitespace-nowrap ${CELL_PAD}`}>{label(CHANGE_LABEL, change.changeType)}</td>
                {/* 짧은 사실(그룹·사용자, 권한·필드, 처리자)은 낱말 안에서 꺾지 않는다(break-keep) — 종전에는 그룹과 사용자를 두 줄로 쌓고
                    '최고관리자'가 글자 단위로 꺾여 한 행이 세 줄(73~92px)이 됐다. 폭이 되면 한 줄이고, 모자라면 낱말 경계(이름과 식별자 사이)에서만
                    줄을 바꾼다 — 모두 한 줄로 묶으면 1366 폭에서 처리자·사유 칸이 가로 스크롤 밖으로 밀려났다(구조 측정). */}
                <td className={`break-keep ${CELL_PAD}`}>{change.group || change.userId ? (
                  <>
                    {change.group && <span>{change.group}</span>}
                    {change.group && change.userId && <span aria-hidden="true" className="text-muted-foreground"> · </span>}
                    {change.userId && <span>{personLabel(change.userNm, change.userId)}</span>}
                  </>
                ) : '—'}</td>
                <td className={`break-keep ${CELL_PAD}`}>{change.grantType ? `${label(GRANT_TYPE_LABEL, change.grantType)} ` : ''}{change.grantCode ?? (change.field ? label(FIELD_LABEL, change.field) : '—')}</td>
                <td className={`max-w-sm whitespace-pre-wrap break-words ${CELL_PAD}`}>{change.before ?? '—'} → {change.after ?? '—'}</td>
                <td className={`break-keep ${CELL_PAD}`}>{change.actorId ? personLabel(change.actorNm, change.actorId) : '—'}</td>
                <td className={`max-w-xs break-words ${CELL_PAD}`}>{change.reason || '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </PermissionScrollRegion>
      )}
      {history.isSuccess && rows.length === 0 && <p role="status">변경 이력이 없습니다.</p>}
      <PagePagination total={history.data?.total ?? 0} page={historyPage} size={PAGE_SIZE} onPageChange={setHistoryPage} />
    </section>
  );
}
