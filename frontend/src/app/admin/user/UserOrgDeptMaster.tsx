'use client';

import { Network, RefreshCcw, Save } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    DragOverlay,
    MeasuringStrategy,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { ErrorStateDisplay } from '@/app/components/ui/status-displays';
import { treeDndAnnouncements, treeDndInstructions } from '@/lib/dnd/tree-dnd-accessibility';
import { dropAnimation, SortableDeptNode, UserOrgMasterSection } from './UserOrgHubParts';
import type { useDeptTree } from './useDeptTree';

type DeptTree = ReturnType<typeof useDeptTree>;

/**
 * 부서 탭의 마스터 — 조직 구조(끌어 옮기는 부서 트리)와 '조직 계층 저장'(2026-10-18 허브 분해 때 UserOrgHubClient 에서 옮겼다 —
 * 마크업·문구·비활성 조건 그대로).
 *
 * <p>조직 계층 저장(쓰기)은 허브가 소유하고 handleSaveDeptHierarchy 로 넘긴다. locked 는 허브의 쓰기 잠금(진행 중인 쓰기가 하나라도
 * 있다)이고 saveBusy 는 그 쓰기가 조직 계층 저장인가다 — 폼 검증 census 가 넘겨받은 처리기와 단추를 이 이름으로 잇는다.
 */
export function UserOrgDeptMaster({
  canUpdateDept,
  locked,
  saveBusy,
  hasSelectedDept,
  isDeptModalOpen,
  handleSaveDeptHierarchy,
  deptTree,
  deptKeyword,
  selectedItemId,
  onSelectDept,
}: {
  canUpdateDept: boolean;
  /** 진행 중인 쓰기가 있다(허브의 쓰기 잠금). */
  locked: boolean;
  /** 진행 중인 쓰기가 조직 계층 저장이다. */
  saveBusy: boolean;
  /** 저장은 고른 부서가 있을 때만 한다(A2 계약). */
  hasSelectedDept: boolean;
  isDeptModalOpen: boolean;
  handleSaveDeptHierarchy: () => Promise<void>;
  deptTree: Pick<DeptTree,
    | 'hasDeptChanges' | 'deptListChangedWhileEditing' | 'discardDeptChanges' | 'isDeptsError' | 'deptsError' | 'refetchDepts'
    | 'sensors' | 'dragHandlers' | 'flattenedDepts' | 'previewDepts' | 'activeDeptId' | 'isDeptsLoading' | 'isDeptsPlaceholder'>;
  /** 부서 탭의 검색어 — 결과가 없을 때 그 말로 안내한다. */
  deptKeyword: string;
  selectedItemId: string | number | null;
  onSelectDept: (ognzId: string | null) => void;
}) {
  const {
    hasDeptChanges,
    deptListChangedWhileEditing,
    discardDeptChanges,
    isDeptsError,
    deptsError,
    refetchDepts,
    sensors,
    dragHandlers: deptDragHandlers,
    flattenedDepts,
    previewDepts,
    activeDeptId,
    isDeptsLoading,
    isDeptsPlaceholder,
  } = deptTree;
  return (
              <UserOrgMasterSection
                title="조직 구조"
                description={canUpdateDept ? '끌어서 순서를 바꾸고 오른쪽으로 밀어 하위 부서로 만듭니다. 키보드로는 부서를 고른 뒤 상세의 부서 자리 바꾸기를 씁니다.' : '부서를 선택하면 오른쪽에 상세가 열립니다.'}
                icon={Network}
                tools={canUpdateDept ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveDeptHierarchy}
                    disabled={!hasDeptChanges || !hasSelectedDept || locked || saveBusy || isDeptModalOpen}
                    aria-busy={saveBusy || undefined}
                    className="gap-1.5"
                  >
                    {saveBusy
                      ? <RefreshCcw size={14} className="animate-spin" aria-hidden="true" />
                      : <Save size={14} aria-hidden="true" />}
                    {saveBusy ? '조직 계층 저장 중…' : '조직 계층 저장'}
                  </Button>
                ) : undefined}
              >
                {deptListChangedWhileEditing && (
                  <div role="status" className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
                    <span>저장하지 않은 순서 변경이 있는 동안 부서 목록이 다시 조회됐습니다. 저장하면 지금 화면의 순서로 반영되고, 취소하면 최신 목록으로 돌아갑니다.</span>
                    <Button type="button" size="sm" variant="outline" onClick={discardDeptChanges} disabled={locked}>변경 취소</Button>
                  </div>
                )}
                {/* ⚠ 이 스크롤 영역은 DEPTS 전용이다 — USERS·ABSENCES 는 표가 자기 스크롤을 소유하므로
                    여기에 탭 분기를 두면 도달할 수 없는 가지가 된다. A2 census 는 이 라벨을
                    부서 마스터 스크롤 영역의 이름으로 고정한다. */}
                <div
                  role="region"
                  aria-label="부서 조직 구조"
                  tabIndex={0}
                  className="max-h-[60vh] min-h-0 flex-1 overflow-y-auto pr-1 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  {/* 조직도는 테이블이 아니라 D&D 트리다. 실패를 토스트로만 알리면 화면은
                      '부서 0건'으로 남아 조회 실패와 구분되지 않는다(감사 P1-1). */}
                  {isDeptsError ? (
                    <ErrorStateDisplay error={deptsError} onRetry={() => refetchDepts()} />
                  ) : (
                    <>
                      <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
                          accessibility={{
                            announcements: treeDndAnnouncements('부서', (id) => flattenedDepts.find((d) => d.ognzId === String(id))?.ognzNm ?? undefined),
                            screenReaderInstructions: treeDndInstructions('부서', '상세의 부서 자리 바꾸기'),
                          }}
                          {...deptDragHandlers}
                      >
                          <SortableContext items={previewDepts.map(n => n.ognzId || '')} strategy={verticalListSortingStrategy}>
                              <div className="space-y-0.5">
                                  {previewDepts.map((node, index) => (
                                      <SortableDeptNode
                                          key={node.ognzId}
                                          node={node}
                                          isSelected={selectedItemId === node.ognzId}
                                          isTabStop={selectedItemId === node.ognzId || (selectedItemId === null && index === 0)}
                                          onClick={() => onSelectDept(node.ognzId || null)}
                                          reorderable={canUpdateDept}
                                      />
                                  ))}
                              </div>
                          </SortableContext>

                          {typeof document !== 'undefined' && createPortal(
                              <DragOverlay dropAnimation={dropAnimation}>
                                  {activeDeptId ? (
                                      <SortableDeptNode
                                          node={flattenedDepts.find(n => n.ognzId === activeDeptId)!}
                                          isSelected={false}
                                          isTabStop={false}
                                          onClick={() => {}}
                                          isOverlay
                                      />
                                  ) : null}
                              </DragOverlay>,
                              document.body
                          )}
                      </DndContext>
                      {/* 이전 검색어가 0건이었으면 새 검색어의 응답이 오기 전에도 행이 비어 있다 — 그때 새 검색어에 대해
                          '없습니다' 라고 말하지 않고 조회 중임을 알린다(G15, DEC-OPS-195 ③의 갱신 중 상태 문장). */}
                      {flattenedDepts.length === 0 && !isDeptsLoading && (
                          <p
                            className="py-10 text-center text-[length:var(--font-size-body)] text-muted-foreground"
                            {...(isDeptsPlaceholder ? { role: 'status' } : {})}
                          >
                            {isDeptsPlaceholder
                              ? '부서를 불러오는 중…'
                              : deptKeyword
                                ? `'${deptKeyword}' 에 해당하는 부서가 없습니다.`
                                : '등록된 부서가 없습니다. 오른쪽 위 부서 등록으로 첫 부서를 만듭니다.'}
                          </p>
                      )}
                    </>
                  )}
                </div>
              </UserOrgMasterSection>
  );
}
