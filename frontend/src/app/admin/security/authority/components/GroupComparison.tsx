'use client';

import { useId, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { grantKey } from '@/lib/auth/authorization-management-contract';
import { PERMISSION_MATRIX_COLUMNS, PERMISSION_MATRIX_OTHER_COLUMN_LABEL, permissionActionLabel } from '@/lib/auth/permission-labels';
import { authorizationAdminService } from '@/services/foundation/system/AuthorizationAdminService';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useOverflowRegion } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { isGroupRow, SCREEN_PERMISSION_COLUMNS } from './screen-permission-model';
import {
  compareGroups,
  shownOperationCategories,
  shownScreenRows,
  type ComparedOperationCell,
  type ScreenCompareCell,
} from './group-comparison-model';

/** 비교에서 편집으로 옮길 곳 — 그 그룹의 편집기 탭과(화면별 권한이면) 메뉴 줄. */
export type ComparisonEditTarget = { menuCode: string | null; tab: 'screens' | 'operations' };

/**
 * 비교 조건(A·B 그룹, 보기, 차이만 보기). 허브가 들고 있다 — 비교 → '{A}에서 편집' → 저장 → 다시 비교로 돌아왔을 때 같은 두
 * 그룹을 다시 고르지 않게 한다. 화면 안 상태라 URL·브라우저 저장소에 두지 않는다(PD-UX-002).
 */
export interface ComparisonSelection { a: string; b: string; view: 'screens' | 'operations'; onlyDifferences: boolean }
export const EMPTY_COMPARISON_SELECTION: ComparisonSelection = { a: '', b: '', view: 'screens', onlyDifferences: false };

const CELL_CLASS = 'border-b border-border px-[var(--cell-px)] py-[var(--cell-py)] text-center align-middle';
const HEAD_CLASS = 'sticky top-0 z-20 whitespace-nowrap border-b border-border bg-muted px-[var(--cell-px)] py-[var(--cell-py)] text-center text-xs font-semibold';
const DIFFERS_CLASS = 'bg-primary/10 font-medium';
const SELECT_CLASS = 'block h-[var(--control-h)] min-w-[14rem] rounded-md border border-input bg-background px-3';
const SCROLL_CLASS = 'relative max-h-[min(70vh,48rem)] overflow-auto rounded-md border border-border';

/**
 * 비교 표의 스크롤 상자. 넘치면 키보드로 스크롤할 수 있게 이름 있는 영역이 된다(WCAG 2.1.1, axe scrollable-region-focusable) —
 * 조회 권한만 가진 사람에게는 상자 안에 포커스할 요소(편집 버튼)가 없다. 상자가 두 그룹을 고른 뒤에야 마운트되므로 훅을 상자와
 * 같은 컴포넌트에 둔다(늦게 마운트되는 상자에 허브 쪽 훅을 걸면 속성이 붙지 않는다).
 *
 * [2026-10-05] 상자는 `relative` 다 — 안쪽 sr-only(position:absolute) 요소가 상자에 잘리지 않고 문서 높이를 늘리는 빈 스크롤을
 * 막는다(PermissionScrollRegion 과 같은 결함·같은 수리). 스크롤 영역 위치 지정 계약(scroll-region-containment)이 렌더로 고정한다.
 *   export 는 그 계약이 상자만 따로 렌더하기 위한 것이다 — 비교 표 전체는 두 그룹의 권한 조회를 거쳐야 상자가 마운트돼, 렌더
 *   계약이 쿼리 모의에 묶이지 않게 했다. 화면 코드는 이 상자를 직접 쓰지 않는다(GroupComparison 안에서만 쓴다).
 */
export function ComparisonScrollRegion({ label, children }: { label: string; children: ReactNode }) {
  const regionProps = useOverflowRegion<HTMLDivElement>(label);
  return <div {...regionProps} className={SCROLL_CLASS}>{children}</div>;
}

/**
 * '그룹 비교'(2026-10-02, 관리 콘솔 UX 3단계 G3). 두 그룹의 저장된 권한을 읽기 전용으로 나란히 본다 — 쓰기가 없다. 고칠 곳은
 * 줄의 '{A 그룹}에서 편집'이 그 그룹의 편집기(화면별 권한 탭의 그 줄, 기능별 줄이면 기능별 권한 탭)로 옮긴다(화면 안 상태
 * 전환, URL·브라우저 저장소 금지). 권한 설정 권한(AUTHRT_GRANT)이 없으면 그 버튼을 두지 않는다.
 *
 * 칸 값은 글자로 쓴다(색만으로 구분하지 않는다, WCAG 1.4.1) — 화면별은 A·B 각각 '있음/없음', 기능별은 'A만'·'B만'·'둘 다'.
 * 다른 칸은 강조하고 보이는 '다름' 표시를 단다. 권한이 여럿인 칸은 A·B 글자가 같아도 다를 수 있으므로(서로 다른 권한을 같은 수만큼)
 * 한쪽에만 있는 권한 이름을 함께 적는다. 전체 그룹 권한은 사용자 메뉴 미리보기와 같은 조회 키를 쓴다.
 */
export function GroupComparison({ selection, onSelectionChange, onEdit }: {
  selection: ComparisonSelection;
  onSelectionChange: (next: ComparisonSelection) => void;
  onEdit: (groupCode: string, target: ComparisonEditTarget) => void;
}) {
  const { user } = useAuth();
  const id = useId();
  const scope = ['authorization', user?.id, user?.authorizationVersion];
  const canRead = canPermission(user, 'AUTHRT_READ');
  const canEdit = canPermission(user, 'AUTHRT_GRANT');
  const catalog = useQuery({ queryKey: [...scope, 'catalog'], queryFn: () => authorizationAdminService.getCatalog(), enabled: canRead, retry: false });
  const matrix = useQuery({ queryKey: [...scope, 'grant-matrix'], queryFn: () => authorizationAdminService.getGrantMatrix(), enabled: canRead, retry: false });
  const { a: aCode, b: bCode, view, onlyDifferences } = selection;
  const update = (patch: Partial<ComparisonSelection>) => onSelectionChange({ ...selection, ...patch });

  const groups = useMemo(() => matrix.data?.groups ?? [], [matrix.data]);
  const groupA = groups.find((group) => group.code === aCode) ?? null;
  const groupB = groups.find((group) => group.code === bCode) ?? null;
  const ready = !!groupA && !!groupB && groupA.code !== groupB.code && !!catalog.data;
  const comparison = useMemo(() => (ready && catalog.data
    ? compareGroups(new Set(groupA!.grants.map(grantKey)), new Set(groupB!.grants.map(grantKey)), catalog.data.navigation, catalog.data.operations)
    : null), [ready, catalog.data, groupA, groupB]);

  const error = catalog.error ?? matrix.error;
  if (!canRead) return null;
  if (error) return <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-4">{extractErrorMessage(error, '전체 그룹 권한을 불러오지 못했습니다. 다시 조회해 주세요.')}</p>;
  if (!catalog.data || !matrix.data) return <p role="status">전체 그룹 권한을 불러오는 중입니다…</p>;

  // 보이는 '다름' — 테두리 있는 글자 표시라 색을 구분하지 못해도 읽힌다.
  const differsMark = <span className="rounded border border-primary/40 px-1 text-foreground">다름</span>;
  const editButton = (rowName: string, target: ComparisonEditTarget): ReactNode => (canEdit && groupA
    ? <Button type="button" variant="outline" size="sm" aria-label={`${groupA.name}에서 편집 (${rowName})`} onClick={() => onEdit(groupA.code, target)}>{groupA.name}에서 편집</Button>
    : null);
  const screenCell = (cell: ScreenCompareCell | null): ReactNode => {
    if (!cell) return null;
    if (cell.kind === 'note') return <span className="text-xs text-muted-foreground">{cell.text}</span>;
    // 권한이 여럿인 칸은 수만 쓰면 다른데도 글자가 같을 수 있다 — 한쪽에만 있는 권한 이름을 적는다.
    const details = cell.differs && cell.a.total > 1;
    return (
      <span className="inline-flex flex-col items-center gap-0.5 text-xs">
        <span className="whitespace-nowrap">A {cell.a.text}</span>
        <span className="whitespace-nowrap">B {cell.b.text}</span>
        {cell.differs && differsMark}
        {details && cell.onlyA.length > 0 && <span className="block max-w-[14rem] text-left">A에만: {cell.onlyA.join(', ')}</span>}
        {details && cell.onlyB.length > 0 && <span className="block max-w-[14rem] text-left">B에만: {cell.onlyB.join(', ')}</span>}
      </span>
    );
  };
  const operationCell = (cell: ComparedOperationCell | null): ReactNode => {
    if (!cell) return null;
    if (!cell.presence) return <span className="sr-only">둘 다 없음</span>;
    return <span className="text-xs">{cell.presence}</span>;
  };
  const differsPresence = (cell: ComparedOperationCell | null) => cell?.presence === 'A만' || cell?.presence === 'B만';

  return (
    <section aria-label="그룹 비교" className="space-y-4 rounded-lg border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">그룹 비교</h2>
      <p className="text-sm text-muted-foreground">두 그룹의 저장된 기능권한과 메뉴 표시를 나란히 봅니다. 이 화면에서는 바꾸지 않습니다 — 고칠 줄의 편집 버튼으로 그 그룹의 권한 설정으로 옮기세요.</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block space-y-1 text-sm">A 그룹
          <select className={SELECT_CLASS} value={aCode} onChange={(event) => update({ a: event.target.value })}>
            <option value="">그룹 고르기</option>
            {groups.map((group) => <option key={group.code} value={group.code}>{group.name} ({group.code})</option>)}
          </select>
        </label>
        <label className="block space-y-1 text-sm">B 그룹
          <select className={SELECT_CLASS} value={bCode} onChange={(event) => update({ b: event.target.value })}>
            <option value="">그룹 고르기</option>
            {groups.map((group) => <option key={group.code} value={group.code}>{group.name} ({group.code})</option>)}
          </select>
        </label>
        <span className="flex items-center gap-2 text-sm">
          <Checkbox id={`${id}-only-differences`} checked={onlyDifferences} onCheckedChange={(next) => update({ onlyDifferences: next === true })} />
          <label htmlFor={`${id}-only-differences`}>차이만 보기</label>
        </span>
      </div>
      {matrix.data.catalogVersion !== catalog.data.catalogVersion && <p role="status" className="text-sm text-muted-foreground">기능 목록이 바뀌어 비교가 최신이 아닐 수 있습니다. &apos;새로 조회&apos;를 눌러 다시 읽어 주세요.</p>}
      {!groupA || !groupB ? <p role="status" className="text-sm">비교할 A 그룹과 B 그룹을 고르세요.</p>
        : groupA.code === groupB.code ? <p role="status" className="text-sm">서로 다른 두 그룹을 고르세요.</p>
          : comparison && <div className="space-y-3">
            <p role="status" className="text-sm font-medium">A에만 {comparison.onlyA} · B에만 {comparison.onlyB}
              <span className="ml-2 font-normal text-muted-foreground">(A: {groupA.name}, B: {groupB.name}{comparison.onlyA + comparison.onlyB === 0 ? ' — 두 그룹의 권한이 같습니다' : ''})</span>
            </p>
            {comparison.unknown > 0 && <p className="text-sm text-muted-foreground">현재 기능·메뉴 목록에 없는 권한 {comparison.unknown}개는 비교에서 뺐습니다.</p>}
            <Tabs value={view} onValueChange={(value) => update({ view: value as 'screens' | 'operations' })} className="gap-3">
              <TabsList aria-label="비교 보기" className="flex-wrap group-data-[orientation=horizontal]/tabs:h-auto">
                <TabsTrigger value="screens" className="flex-none px-3">화면별</TabsTrigger>
                <TabsTrigger value="operations" className="flex-none px-3">기능별</TabsTrigger>
              </TabsList>
              <TabsContent value="screens" className="space-y-2">
                {comparison.navigationError ? <p role="alert" className="text-sm text-destructive">{comparison.navigationError} 화면별 비교를 보일 수 없습니다.</p> : (() => {
                  const rows = shownScreenRows(comparison, onlyDifferences);
                  if (rows.length === 0) return <p role="status" className="text-sm">{onlyDifferences ? '화면별 권한에 차이가 없습니다.' : '표시할 메뉴와 화면이 없습니다.'}</p>;
                  return (
                    <ComparisonScrollRegion label="화면별 비교 표 스크롤 영역">
                      <table className="w-full border-separate border-spacing-0 text-left text-sm">
                        <caption className="sr-only">{`${groupA.name}(A)와 ${groupB.name}(B)의 화면별 권한 비교. 칸마다 A와 B의 권한 유무를 적고, 서로 다른 칸에는 '다름'을, 권한이 여럿인 칸에는 한쪽에만 있는 권한 이름을 덧붙입니다.`}</caption>
                        <thead>
                          <tr>
                            <th scope="col" className="sticky left-0 top-0 z-30 min-w-[16rem] border-b border-border bg-muted px-[var(--cell-px)] py-[var(--cell-py)]">메뉴·화면</th>
                            {SCREEN_PERMISSION_COLUMNS.map((column) => <th key={column.key} scope="col" className={HEAD_CLASS}>{column.label}</th>)}
                            {canEdit && <th scope="col" className={HEAD_CLASS}>편집</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map(({ row, cells, differs }) => (
                            <tr key={row.key} data-differs={differs ? 'true' : undefined}>
                              <th scope="row" aria-label={row.name} className="sticky left-0 z-10 border-b border-border bg-card px-[var(--cell-px)] py-[var(--cell-py)] text-left font-normal">
                                <span className="block break-words" style={{ paddingLeft: `${row.depth * 1.25}rem` }}>
                                  <span className={cn(isGroupRow(row) ? 'font-semibold' : 'font-medium')}>{row.name}</span>
                                  {row.unused && <span className="ml-2 rounded border border-border px-1 text-xs text-muted-foreground">사용 안 함</span>}
                                  {row.route && <span className="block break-all text-xs text-muted-foreground">{row.route}</span>}
                                </span>
                              </th>
                              {SCREEN_PERMISSION_COLUMNS.map((column) => {
                                const cell = cells[column.key];
                                return <td key={column.key} className={cn(CELL_CLASS, cell?.kind === 'grant' && cell.differs && DIFFERS_CLASS)}>{screenCell(cell)}</td>;
                              })}
                              {canEdit && <td className={CELL_CLASS}>{row.kind !== 'unmatched-group' && editButton(row.name, { menuCode: row.menuCode, tab: 'screens' })}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ComparisonScrollRegion>
                  );
                })()}
              </TabsContent>
              <TabsContent value="operations" className="space-y-2">
                {(() => {
                  const categories = shownOperationCategories(comparison, onlyDifferences);
                  if (categories.length === 0) return <p role="status" className="text-sm">{onlyDifferences ? '기능별 권한에 차이가 없습니다.' : '표시할 업무 영역이 없습니다.'}</p>;
                  return (
                    <ComparisonScrollRegion label="기능별 비교 표 스크롤 영역">
                      <table className="w-full border-separate border-spacing-0 text-left text-sm">
                        <caption className="sr-only">{`${groupA.name}(A)와 ${groupB.name}(B)의 업무 영역별 기능권한 비교. 칸 값은 A만·B만·둘 다이고, 빈칸은 두 그룹 모두 없는 권한입니다.`}</caption>
                        <thead>
                          <tr>
                            <th scope="col" className="sticky left-0 top-0 z-30 min-w-[12rem] border-b border-border bg-muted px-[var(--cell-px)] py-[var(--cell-py)]">업무 영역</th>
                            {PERMISSION_MATRIX_COLUMNS.map((column) => <th key={column.action} scope="col" className={HEAD_CLASS}>{column.label}</th>)}
                            <th scope="col" className={HEAD_CLASS}>{PERMISSION_MATRIX_OTHER_COLUMN_LABEL}</th>
                            {canEdit && <th scope="col" className={HEAD_CLASS}>편집</th>}
                          </tr>
                        </thead>
                        {categories.map((category) => (
                          <tbody key={category.key}>
                            <tr>
                              <th scope="rowgroup" aria-label={category.label} colSpan={PERMISSION_MATRIX_COLUMNS.length + (canEdit ? 3 : 2)} className="border-b border-border bg-muted/50 px-[var(--cell-px)] py-[var(--cell-py)] text-left font-semibold">{category.label}</th>
                            </tr>
                            {category.rows.map(({ row, columns, others, differs }) => (
                              <tr key={row.domain} data-differs={differs ? 'true' : undefined}>
                                <th scope="row" aria-label={row.label} className="sticky left-0 z-10 border-b border-border bg-card px-[var(--cell-px)] py-[var(--cell-py)] text-left font-normal">
                                  <span className="block font-medium">{row.label}</span>
                                  <span className="block text-xs text-muted-foreground">{row.domain}</span>
                                </th>
                                {columns.map((cell, index) => <td key={PERMISSION_MATRIX_COLUMNS[index].action} className={cn(CELL_CLASS, differsPresence(cell) && DIFFERS_CLASS)}>{operationCell(cell)}</td>)}
                                <td className="border-b border-border px-[var(--cell-px)] py-[var(--cell-py)]">
                                  <ul className="flex flex-wrap gap-2 text-xs">
                                    {others.filter((cell) => cell.presence).map((cell) => (
                                      <li key={cell.operation.code} className={cn('rounded px-1', differsPresence(cell) && DIFFERS_CLASS)}>{permissionActionLabel(cell.operation.action)} {cell.presence}</li>
                                    ))}
                                  </ul>
                                </td>
                                {canEdit && <td className={CELL_CLASS}>{editButton(row.label, { menuCode: null, tab: 'operations' })}</td>}
                              </tr>
                            ))}
                          </tbody>
                        ))}
                      </table>
                    </ComparisonScrollRegion>
                  );
                })()}
              </TabsContent>
            </Tabs>
          </div>}
    </section>
  );
}
