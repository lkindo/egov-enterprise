import { Network, ShieldCheck, UserMinus, Users } from 'lucide-react';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import type { Department } from '@/services/foundation/system/DeptAdminService';
import { NavButton, UserListFilterFields, type UserListFilters } from './UserOrgHubParts';
import type { UserOrgTab } from './user-org-prefetch';

export function UserOrgTabNav({ activeTab, onTabChange }: { activeTab: UserOrgTab; onTabChange: (tab: UserOrgTab) => void }) {
  return (
        <nav
          aria-label="사용자 및 조직 관리 화면 전환"
          className="flex w-fit max-w-full flex-wrap rounded-md border border-border bg-muted/50 p-0.5"
        >
          <NavButton icon={<Users size={14} />} label="사용자" active={activeTab === 'USERS'} onClick={() => onTabChange('USERS')} />
          <NavButton icon={<Network size={14} />} label="부서 관리" active={activeTab === 'DEPTS'} onClick={() => onTabChange('DEPTS')} />
          <NavButton icon={<UserMinus size={14} />} label="부재 상태 관리" active={activeTab === 'ABSENCES'} onClick={() => onTabChange('ABSENCES')} />
          <NavButton icon={<ShieldCheck size={14} />} label="조직 정책" active={activeTab === 'POLICIES'} onClick={() => onTabChange('POLICIES')} />
        </nav>
  );
}

/** 조회조건 — 검색어(부서 탭은 부서 검색)와 사용자 탭의 계정 상태·소속 부서·로그인 잠금 조건, 부서 탭의 검색 안내. */
export function UserOrgFilterBar({
  isDeptTab,
  showUserFilters,
  searchKeyword,
  onSearch,
  onReset,
  userFilterId,
  userFilters,
  departments,
  onChangeFilter,
}: {
  isDeptTab: boolean;
  showUserFilters: boolean;
  searchKeyword: string;
  onSearch: (next: string) => void;
  onReset: () => void;
  userFilterId: string;
  userFilters: UserListFilters;
  departments: Department[];
  onChangeFilter: (patch: Partial<UserListFilters>) => void;
}) {
  return (
        <div className="flex flex-wrap items-end gap-2">
          {/* ⚠ min-width 는 sm 이상에서만 건다 — 320px 뷰포트에서 14rem(224px) 하한이 flex-shrink 를
              무력화해 조회조건 영역이 가로로 넘친다(ui-ux-task-flow-optimization 가이드의 320px 무넘침
              의무). 종전 검색 입력에는 하한이 없었다. */}
          {/* 보이는 라벨과 접근 이름을 같게 둔다(WCAG 2.5.3). e2e(department-hierarchy·security-administration)는
              이 접근 이름('부서 검색')으로, user-administration 은 placeholder('검색어를 입력하세요...')로 입력을 찾는다 —
              문구를 바꾸면 그 스펙도 함께 고친다. 검색어가 바뀌면 페이지를 1로 되돌린다(감사 P1-8). */}
          <div className="min-w-0 flex-1 sm:min-w-[14rem]">
            <KeywordFilter
              label={isDeptTab ? '부서 검색' : '사용자 검색'}
              placeholder="검색어를 입력하세요..."
              value={searchKeyword}
              onSearch={onSearch}
              onReset={onReset}
            >
              {/* [2026-09-26 DIP B5 F4] 사용자 탭만 계정 상태·소속 부서·로그인 잠금으로 좁힌다.
                  부재 탭은 부재를 판정하려고 전체 사용자를 보므로 조건을 두지 않는다. 부서는 직속 소속만 본다. */}
              {showUserFilters && (
                <UserListFilterFields
                  userFilterId={userFilterId}
                  userFilters={userFilters}
                  departments={departments}
                  onChangeFilter={onChangeFilter}
                />
              )}
            </KeywordFilter>
          </div>
          {/* 안내는 라벨·placeholder 로 알 수 없는 사실이 있을 때만 둔다 — 사용자 탭의
              '사용자명 또는 ID 로 검색합니다' 는 라벨의 반복이라 한 줄을 더 쓸 값이 없었다. */}
          {isDeptTab && (
            /*
              ⚠ 이 문구는 실제로 있는 보호만 말해야 한다(G10·헌법 제16조 4항).

                종전에는 '검색 중에는 계층을 바꿀 수 없습니다' 라는 없는 가드를 약속하려다,
                대신 일어나는 손상을 그대로 고지했다 — 좁힌 결과에 상위가 빠진 노드를 저장하면
                up_ognz_id 가 비워졌다(GAP-DEPT-001).

                지금은 보호가 존재한다: listToDeptTree 가 '상위를 모른다'(unloadedParentId)를
                들고 가고, saveDeptHierarchyAction 이 그 노드를 전송에서 뺀다. 드래그한 노드는
                표시가 해제되어 정상 반영된다. 여기서 말하는 것은 그 규칙 그대로다.
                ⚠ '검색 중에는 안전하다' 로 넓히지 마라 — 보호 단위는 검색이 아니라 노드다.
            */
            <p className="basis-full text-xs text-muted-foreground">
              부서명으로 조직도를 좁힙니다. 좁힌 결과에 상위 부서가 없는 부서는 맨 위에 보이지만,
              저장해도 상위 관계를 그대로 둡니다 — 직접 옮긴 부서만 바뀝니다.
            </p>
          )}
        </div>
  );
}
