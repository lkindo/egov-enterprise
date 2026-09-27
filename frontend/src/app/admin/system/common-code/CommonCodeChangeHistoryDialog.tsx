'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { PagePagination } from '@/components/common/PagePagination';
import { codeAdminService, type CommonCodeChange } from '@/services/foundation/system/CodeAdminService';

/**
 * 공통코드 변경 이력(2026-09-27 DIP B5 F11).
 *
 * 분류·그룹·상세 코드의 등록·수정·삭제는 서버가 같은 트랜잭션에서 한 건씩 남긴다. 그룹을 열면 그 그룹과
 * 상세 코드의 이력을, 분류를 열면 분류 자신의 이력만 보인다(소속 그룹의 이력은 그룹에서 본다).
 * 열릴 때만 마운트하므로 목록 화면은 이력을 조회하지 않는다.
 *
 * 표현은 권한 변경 이력(AuthorizationHistory)과 같은 캡션 있는 기본 표 + PagePagination 이다 —
 * 조회형 목록 화면이 아니라 대화상자 안의 감사 기록이라 A1 셸의 대상이 아니다.
 */
export interface CodeChangeHistoryTarget {
  kind: 'group' | 'cluster';
  id: string;
  name: string;
}

const PAGE_SIZE = 10;
const COLUMNS = ['변경 일시', '대상', '변경', '항목', '변경 전 → 후', '변경자'];

const TARGET_LABEL: Record<string, string> = { CLSF: '분류', CODE: '그룹', DTL: '상세 코드' };
const CHANGE_LABEL: Record<string, string> = { ADD: '등록', UPDATE: '수정', REMOVE: '삭제(사용 안 함)' };

function formatChangedAt(value?: string): string {
  return value ? value.substring(0, 19).replace('T', ' ') : '-';
}

function targetText(item: CommonCodeChange): string {
  const label = TARGET_LABEL[item.chgTrgtTypeCd ?? ''] ?? item.chgTrgtTypeCd ?? '-';
  if (item.chgTrgtTypeCd === 'DTL') return `${label} ${item.dtlCd ?? ''}`.trim();
  if (item.chgTrgtTypeCd === 'CODE') return `${label} ${item.cdId ?? ''}`.trim();
  return `${label} ${item.clsfCd ?? ''}`.trim();
}

export function CommonCodeChangeHistoryDialog({
  target,
  onClose,
}: {
  target: CodeChangeHistoryTarget;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);
  const scope = target.kind === 'group' ? { cdId: target.id } : { clsfCd: target.id };
  const history = useQuery({
    queryKey: ['common-code-change-history', target.kind, target.id, page],
    queryFn: () => codeAdminService.getCodeChangeHistory(scope, page - 1, PAGE_SIZE),
    // 수정한 직후 다시 열어도 방금 남은 이력이 보이도록 열 때마다 다시 읽는다.
    staleTime: 0,
  });
  const rows = history.data?.list ?? [];

  return (
    <StandardModal isOpen onClose={onClose} title={`${target.name} 변경 이력`} maxWidth="5xl">
      <div className="space-y-3 pt-2">
        <p className="text-sm text-muted-foreground">
          {target.kind === 'group'
            ? '이 그룹과 상세 코드의 등록·수정·삭제 이력입니다. 최신순입니다.'
            : '이 분류 자신의 등록·수정·삭제 이력입니다. 소속 그룹의 이력은 그룹에서 확인하세요.'}
        </p>
        {history.isPending && <p role="status">변경 이력을 불러오는 중입니다…</p>}
        {history.isError && (
          <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive">
            변경 이력을 불러오지 못했습니다.
            <Button type="button" variant="outline" size="sm" onClick={() => history.refetch()}>다시 시도</Button>
          </div>
        )}
        {history.isSuccess && rows.length === 0 && <p role="status">남은 변경 이력이 없습니다.</p>}
        {rows.length > 0 && (
          <div className="overflow-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{`${target.name} 변경 이력`}</caption>
              <thead className="bg-muted">
                <tr>{COLUMNS.map((title) => <th key={title} scope="col" className="p-3">{title}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.comCdChgHstrySn} className="border-t border-border">
                    <td className="p-3 tabular-nums">{formatChangedAt(item.crtDt)}</td>
                    <td className="p-3">{targetText(item)}</td>
                    <td className="p-3">{CHANGE_LABEL[item.chgTypeCd ?? ''] ?? item.chgTypeCd ?? '-'}</td>
                    <td className="p-3">{item.chgArtclNm ?? '-'}</td>
                    <td className="max-w-sm whitespace-pre-wrap break-words p-3">{item.chgBfrCn ?? '—'} → {item.chgAftrCn ?? '—'}</td>
                    {/* 변경자 이름을 찾지 못하면(퇴사·삭제) 식별자 대신 그렇게 말한다. */}
                    <td className="p-3">{item.chgUserNm ?? '알 수 없는 사용자'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <PagePagination total={history.data?.total ?? 0} page={page} size={PAGE_SIZE} onPageChange={setPage} />
      </div>
    </StandardModal>
  );
}
