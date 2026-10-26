'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { PagePagination } from '@/components/common/PagePagination';
import { boardMasterQueryOptions } from '@/queries/board-master-query-options';
import type { BoardChange } from '@/services/foundation/system/BoardAdminService';
import { describeBoardChange } from './board-setting-values';

/**
 * 게시판 변경 이력(ADR-0040 결정 9). 서버가 바뀐 항목마다 한 건씩 남긴다 — 설정·사용 여부 변경과, B1 부터 운영 화면에서 바꾼 게시
 * 기간(빠른 편집·종료일 일괄 처리)과, B2 부터 상단 고정·해제(한 건·일괄, 고정 여부와 고정 종료일)가 남는다. 작성 화면의 글 수정은
 * 남지 않는다(C2 범위). 게시글 행은 게시물 조회 대행 권한이 있을 때만 서버가 싣는다. 열릴 때만 마운트하므로 설정 탭은 이력을 조회하지
 * 않는다.
 *
 * 표현은 공통코드 변경 이력과 같은 캡션 있는 기본 표 + PagePagination 이다 — 조회형 목록이 아니라 대화상자 안의 감사 기록이다.
 *
 * [2026-10-26 ADR-0043 1차 SET-08] 값은 설정 탭과 같은 말(받음/받지 않음, MB, '필수(늘 비밀글로 저장)', yyyy-MM-dd)로 보이고, 바꿔
 * 보인 행에는 서버가 남긴 저장값을 보조로 함께 둔다(board-setting-values.ts). 기록 자체는 바꾸지 않는다.
 */
const PAGE_SIZE = 10;
const COLUMNS = ['변경 일시', '대상', '변경', '항목', '변경 전 → 후', '변경자'];

const CHANGE_LABEL: Record<string, string> = {
  SETTING: '설정',
  USE: '사용 여부',
  PERIOD: '게시 기간',
  PIN: '상단 고정',
  UNPIN: '고정 해제',
};

function formatChangedAt(value?: string): string {
  return value ? value.substring(0, 19).replace('T', ' ') : '-';
}

function targetText(item: BoardChange): string {
  return item.chgTrgtTypeCd === 'PST' ? `게시글 ${item.pstSn ?? ''}`.trim() : '게시판';
}

export function BoardChangeHistoryDialog({ bbsId, boardName, onClose }: {
  bbsId: string;
  boardName: string;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);
  const history = useQuery({
    ...boardMasterQueryOptions.changeHistory(bbsId, page, PAGE_SIZE),
    // 저장한 직후 다시 열어도 방금 남은 이력이 보이도록 열 때마다 다시 읽는다.
    staleTime: 0,
  });
  const rows = history.data?.list ?? [];

  return (
    <StandardModal isOpen onClose={onClose} title={`${boardName} 변경 이력`} maxWidth="5xl">
      <div className="space-y-3 pt-2">
        <p className="text-sm text-muted-foreground">
          설정·게시판 사용 변경과 운영 화면에서 바꾼 게시 기간·상단 고정의 이력입니다. 최신순입니다. 작성 화면의 글 수정과 게시판 영구
          삭제는 여기에 남지 않습니다.
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
          <div className="relative overflow-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{`${boardName} 변경 이력`}</caption>
              <thead className="bg-muted">
                <tr>{COLUMNS.map((title) => <th key={title} scope="col" className="p-3">{title}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const values = describeBoardChange(item.chgArtclNm, item.chgBfrCn, item.chgAftrCn);
                  return (
                    <tr key={item.bbsChgHstrySn} className="border-t border-border align-top">
                      <td className="p-3 tabular-nums">{formatChangedAt(item.crtDt)}</td>
                      <td className="p-3">{targetText(item)}</td>
                      <td className="p-3">{CHANGE_LABEL[item.chgTypeCd] ?? item.chgTypeCd}</td>
                      <td className="p-3">{values.label}</td>
                      <td className="max-w-sm whitespace-pre-wrap break-words p-3">
                        {values.before} → {values.after}
                        {values.stored !== null && (
                          <span className="mt-1 block text-xs text-muted-foreground">저장값: {values.stored}</span>
                        )}
                      </td>
                      {/* 변경자 이름을 찾지 못하면(퇴사·삭제·시스템 처리) 식별자 대신 그렇게 말한다. */}
                      <td className="p-3">{item.chgUserNm ?? '알 수 없는 사용자'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <PagePagination total={history.data?.total ?? 0} page={page} size={PAGE_SIZE} onPageChange={setPage} />
      </div>
    </StandardModal>
  );
}
