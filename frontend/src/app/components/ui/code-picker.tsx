'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { StandardModal } from './standard-modal';
import { VirtualScrollList } from './virtual-scroll-list';
import { codeAdminService } from '@/services/foundation/system/CodeAdminService';
import { CmmnCode, CmmnDetailCode } from '@/types/foundation/system';
import { ChevronLeft, ChevronRight, Search, Tag } from 'lucide-react';

/**
 * CodePicker 선택 결과 — 상세코드는 그룹 문맥 없이는 의미가 없으므로
 * (dtlCd 는 그룹 내에서만 유일) 그룹과 코드를 함께 넘긴다.
 */
export interface CodePickerSelection {
  /** 선택한 코드가 속한 그룹 */
  group: CmmnCode;
  /** 선택한 상세코드 */
  code: CmmnDetailCode;
}

interface CodePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selection: CodePickerSelection) => void;
  title?: string;
}

/**
 * 공통코드 검색·선택 팝업 — UserPicker 패턴(모달 + 검색폼 + 가상 리스트)을
 * 공통코드 도메인으로 일반화한 컴포넌트.
 *
 * 2단 검색: ① 그룹 검색(서버, GET /admin/system/codes/cmmn) → ② 그룹 선택 후
 * 상세코드 목록(서버, GET /admin/system/codes/detail) + 클라이언트 필터.
 * 기존 read-only 조회 API 만 재사용하며 신규 백엔드·뮤테이션이 없다.
 *
 * 그룹 검색 축은 백엔드 계약(CommonCodeGroupRepositoryImpl.conditionEq)을 그대로 따른다:
 * searchCondition '2' = 코드명 contains, '1' = 코드ID contains. 기본은 코드명 검색이고,
 * 결과가 없을 때 검색어가 ID 형태(영숫자·-·_)면 ID 축으로 1회만 폴백한다(최대 2요청, 결정적).
 */
export function CodePicker({
  isOpen,
  onClose,
  onSelect,
  title = '공통코드 검색 및 선택',
}: CodePickerProps) {
  // --- Stage 1: 그룹 검색 ---
  const [groupKeyword, setGroupKeyword] = useState('');
  const [groups, setGroups] = useState<CmmnCode[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsSearched, setGroupsSearched] = useState(false);
  const [groupsError, setGroupsError] = useState(false);

  // --- Stage 2: 선택 그룹의 상세코드 ---
  const [activeGroup, setActiveGroup] = useState<CmmnCode | null>(null);
  const [codes, setCodes] = useState<CmmnDetailCode[]>([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [codesError, setCodesError] = useState(false);
  const [codeFilter, setCodeFilter] = useState('');

  const searchGroups = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const keyword = groupKeyword.trim();
    if (keyword.length < 1) return;

    try {
      setGroupsLoading(true);
      setGroupsError(false);
      const byName = await codeAdminService.getCmmnCodeList({
        searchCondition: '2',
        searchKeyword: keyword,
        pageUnit: 100,
      });
      let list = byName.list || [];
      // 코드명 무결과 + ID 형태 검색어 → ID 축 폴백 1회 (예: "COM017")
      if (list.length === 0 && /^[A-Za-z0-9_-]+$/.test(keyword)) {
        const byId = await codeAdminService.getCmmnCodeList({
          searchCondition: '1',
          searchKeyword: keyword,
          pageUnit: 100,
        });
        list = byId.list || [];
      }
      setGroups(list.filter(Boolean));
      setGroupsSearched(true);
    } catch (error) {
      console.error('공통코드 그룹 검색 실패', error);
      setGroups([]);
      setGroupsSearched(true);
      setGroupsError(true);
    } finally {
      setGroupsLoading(false);
    }
  }, [groupKeyword]);

  const openGroup = useCallback(async (group: CmmnCode) => {
    setActiveGroup(group);
    setCodeFilter('');
    try {
      setCodesLoading(true);
      setCodesError(false);
      // CommonCodeClient 와 동일한 검증된 호출 계약(cdId 스코프 + 페일세이프 필터).
      const res = await codeAdminService.getDetailCodeList({
        cdId: group.cdId,
        searchKeyword: group.cdId,
        searchCondition: '1',
        pageUnit: 999,
      });
      setCodes((res.list || []).filter(item => item && item.cdId === group.cdId));
    } catch (error) {
      console.error('상세코드 목록 조회 실패', error);
      setCodes([]);
      setCodesError(true);
    } finally {
      setCodesLoading(false);
    }
  }, []);

  const backToGroups = useCallback(() => {
    setActiveGroup(null);
    setCodes([]);
    setCodesError(false);
    setCodeFilter('');
  }, []);

  const pickCode = useCallback((code: CmmnDetailCode) => {
    if (!activeGroup) return;
    onSelect({ group: activeGroup, code });
    onClose();
  }, [activeGroup, onSelect, onClose]);

  // 2단계 필터는 이미 받아 둔 목록을 클라이언트에서 거른다(서버 요청 없음 → 디바운스 불필요).
  const visibleCodes = useMemo(() => {
    const q = codeFilter.trim().toLowerCase();
    if (!q) return codes;
    return codes.filter(c =>
      (c.dtlCd || '').toLowerCase().includes(q) || (c.dtlCdNm || '').toLowerCase().includes(q));
  }, [codes, codeFilter]);

  const activateOnKey = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  const renderGroupItem = (group: CmmnCode) => (
    <div
      role="button"
      tabIndex={0}
      aria-label={`그룹 선택: ${group.cdIdNm}`}
      className="flex h-full items-center justify-between px-4 border-b border-border hover:bg-primary/5 transition-colors cursor-pointer group"
      onClick={() => openGroup(group)}
      onKeyDown={(e) => activateOnKey(e, () => openGroup(group))}
    >
      <div className="flex items-center gap-3 truncate">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
          <Tag size={14} aria-hidden="true" />
        </div>
        <div className="truncate">
          <p className="text-sm font-bold text-foreground truncate">{group.cdIdNm}</p>
          <p className="text-xs font-mono text-muted-foreground truncate">{group.cdId}</p>
        </div>
      </div>
      <ChevronRight size={16} aria-hidden="true" className="text-muted-foreground shrink-0" />
    </div>
  );

  const renderCodeItem = (code: CmmnDetailCode) => (
    <div
      role="button"
      tabIndex={0}
      aria-label={`코드 선택: ${code.dtlCdNm}`}
      className="flex h-full items-center justify-between px-4 border-b border-border hover:bg-primary/5 transition-colors cursor-pointer"
      onClick={() => pickCode(code)}
      onKeyDown={(e) => activateOnKey(e, () => pickCode(code))}
    >
      <div className="truncate">
        <p className="text-sm font-bold text-foreground truncate">{code.dtlCdNm}</p>
        <p className="text-xs font-mono text-muted-foreground truncate">{code.dtlCd}</p>
      </div>
      {code.useYn !== 'Y' && (
        <span className="text-xs font-bold text-muted-foreground shrink-0">미사용</span>
      )}
    </div>
  );

  return (
    <StandardModal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="space-y-[var(--form-gap)]">
        {activeGroup === null ? (
          <>
            {/* ① 그룹 검색 */}
            <form onSubmit={searchGroups} className="relative">
              <Search size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                aria-label="코드 그룹 검색어 입력"
                value={groupKeyword}
                onChange={(e) => setGroupKeyword(e.target.value)}
                placeholder="그룹 코드명 또는 코드ID 검색..."
                className="w-full h-[var(--control-h)] pl-9 pr-20 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                autoFocus
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-primary text-primary-foreground rounded-lg text-xs font-bold shadow-sm"
              >
                검색
              </button>
            </form>

            <div className="bg-card border border-border rounded-lg overflow-hidden min-h-[320px] flex flex-col">
              {groupsLoading ? (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground animate-pulse font-medium">
                  검색 중…
                </div>
              ) : groupsError ? (
                <div role="alert" className="flex-1 flex flex-col items-center justify-center text-destructive p-8 text-center space-y-2">
                  <p className="text-sm font-bold">그룹 검색에 실패했습니다.</p>
                  <button
                    type="button"
                    onClick={() => searchGroups()}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs font-bold text-foreground hover:bg-muted transition-colors"
                  >
                    다시 시도
                  </button>
                </div>
              ) : groups.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center space-y-2">
                  <Search size={32} aria-hidden="true" className="opacity-10" />
                  <p className="text-sm font-bold">
                    {groupsSearched ? '검색 결과가 없습니다.' : '그룹 코드명 또는 코드ID 를 입력하고 검색하세요.'}
                  </p>
                </div>
              ) : (
                <VirtualScrollList
                  items={groups}
                  itemHeight={56}
                  containerHeight={320}
                  renderItem={renderGroupItem}
                  className="border-none rounded-none"
                />
              )}
            </div>
          </>
        ) : (
          <>
            {/* ② 선택 그룹의 상세코드 */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={backToGroups}
                aria-label="그룹 목록으로 돌아가기"
                className="w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <div className="truncate">
                <p className="text-sm font-bold text-foreground truncate">{activeGroup.cdIdNm}</p>
                <p className="text-xs font-mono text-muted-foreground truncate">{activeGroup.cdId}</p>
              </div>
            </div>

            <div className="relative">
              <Search size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                aria-label="상세코드 필터 입력"
                value={codeFilter}
                onChange={(e) => setCodeFilter(e.target.value)}
                placeholder="코드 또는 코드명으로 필터..."
                className="w-full h-[var(--control-h)] pl-9 pr-4 rounded-lg border border-border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="bg-card border border-border rounded-lg overflow-hidden min-h-[280px] flex flex-col">
              {codesLoading ? (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground animate-pulse font-medium">
                  불러오는 중…
                </div>
              ) : codesError ? (
                <div role="alert" className="flex-1 flex flex-col items-center justify-center text-destructive p-8 text-center space-y-2">
                  <p className="text-sm font-bold">상세코드 조회에 실패했습니다.</p>
                  <button
                    type="button"
                    onClick={() => openGroup(activeGroup)}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs font-bold text-foreground hover:bg-muted transition-colors"
                  >
                    다시 시도
                  </button>
                </div>
              ) : visibleCodes.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center space-y-2">
                  <Search size={32} aria-hidden="true" className="opacity-10" />
                  <p className="text-sm font-bold">
                    {codes.length === 0 ? '이 그룹에 등록된 상세코드가 없습니다.' : '필터와 일치하는 코드가 없습니다.'}
                  </p>
                </div>
              ) : (
                <VirtualScrollList
                  items={visibleCodes}
                  itemHeight={56}
                  containerHeight={280}
                  renderItem={renderCodeItem}
                  className="border-none rounded-none"
                />
              )}
            </div>
          </>
        )}
      </div>
    </StandardModal>
  );
}
