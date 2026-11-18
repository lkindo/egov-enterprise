import { z } from 'zod';
import { MemoReportInfo } from '@/services/business/memoreport/memoReportService';
import { MemoReportDtoRequestSchema, MemoInstructionRequestRequestSchema } from '@/types/generated-zod';
import { type MemoReportTab as ReportTab } from './memo-report-tabs';

/**
 * 보고 작성 스키마.
 *
 * 길이 상한의 SSOT 는 생성 계약(MemoReportDto)이다 — 직접 적으면 서버가 바뀔 때 화면만 낡아
 * 사용자가 다 쓴 뒤 오류로 되돌아온다.
 *
 * ⚠ `rptrId` 는 **esntlId** 다(MemoReportService.assertParticipantOrAdmin 이 esntlId 로
 * 참여자를 판정한다). 사람이 타이핑할 수 있는 값이 아니라 UserPicker 가 채운다 — 폼 필드로
 * 두는 이유는 "받는 사람 없이 등록" 을 다른 필드와 같은 오류 요약·포커스 경로로 잡기 위해서다.
 */
export const memoComposeSchema = MemoReportDtoRequestSchema.pick({ rptTtl: true, rptCn: true, rptrId: true }).extend({
  rptTtl: z.string().trim()
    .min(1, '제목을 입력해 주세요.')
    .max(100, '제목은 100자까지 입력할 수 있습니다.')
    .pipe(MemoReportDtoRequestSchema.shape.rptTtl),
  rptCn: z.string().trim()
    .min(1, '보고 내용을 입력해 주세요.')
    .max(4000, '보고 내용은 4,000자까지 입력할 수 있습니다.')
    .pipe(MemoReportDtoRequestSchema.shape.rptCn.unwrap()),
  rptrId: z.string().trim()
    .min(1, '받는 사람을 선택해 주세요.')
    .max(20, '받는 사람 식별자는 20자까지 허용됩니다.')
    .pipe(MemoReportDtoRequestSchema.shape.rptrId),
});

export const memoInstructionSchema = MemoInstructionRequestRequestSchema.pick({ drctnMttr: true }).extend({
  drctnMttr: z.string().trim().min(1, '지시사항을 입력해 주세요.').max(2000, '지시사항은 2,000자까지 입력할 수 있습니다.')
    .pipe(MemoInstructionRequestRequestSchema.shape.drctnMttr),
});

export const COMPOSE_LABELS = { rptTtl: '제목', rptrId: '받는 사람', rptCn: '내용' };
export const INSTRUCTION_LABELS = { drctnMttr: '지시사항' };

// 탭 목록과 `?tab=` 해석은 memo-report-tabs.ts 에 있다(탭 목적지 계약이 서버 알림과 대조한다).

export const TAB_LABELS: Record<ReportTab, string> = {
  RECEIVED: '수신함',
  MY: '발신함',
  ALL: '전체',
};

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50];

export function isCompleteInstructionSnapshot(report: MemoReportInfo | undefined): boolean {
  return !!report
    && Array.isArray(report.attachments)
    && MemoInstructionRequestRequestSchema.shape.instructionReadToken.safeParse(report.instructionReadToken).success;
}
