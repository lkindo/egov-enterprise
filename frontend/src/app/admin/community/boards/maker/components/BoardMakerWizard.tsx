'use client';

import React, { useState } from 'react';
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BoardPreview, type BoardPreviewFeatures } from './BoardPreview';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { boardAdminService, type BoardMasterSummary } from '@/services/foundation/system/BoardAdminService';
import { useQueryClient } from "@tanstack/react-query";
/* reusable-base:community:start */
import { useQuery } from "@tanstack/react-query";
import { communityUserService } from '@/services/business/user/community/CommunityUserService';
/* reusable-base:community:end */
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Layout,
  ShieldCheck,
  Rocket,
  Loader2,
  HelpCircle,
  CalendarDays,
  Book,
  MessageSquare,
  Settings2,
  BookOpen,
  List,
  ImageIcon,
  ArrowUpRight,
  Info,
  Copy,
  type LucideIcon
} from "lucide-react";
import { BOARD_TYPES, DEFAULT_BOARD_TYPE, boardTemplateName, type BoardTemplateId } from '@/lib/board/board-types';
import { cn } from "@/lib/utils";
import { useAppForm } from '@/hooks/useAppForm';
import { FormErrorSummary } from '@/components/ui/form';
import { extractFieldErrors } from '@/app/actions/actionUtils';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useToast } from '@/app/components/ui/toast';
import { DynamicBreadcrumb } from '@/app/components/layout/DynamicBreadcrumb';
import { handOffScreen } from '@/lib/navigation/target-handoff';
import { boardMenuRoute } from '@/lib/board/board-menu-links';
import { userFacingErrorMessage } from '@/lib/safe-error-log';

/*
  [2026-10-23 ADR-0040 §5.3] 단계를 다시 짰다. 게시판은 사용 안 함으로 만들고 결과 화면이 운영 화면의 메뉴·접근 탭(공개 준비)으로 이어 준다.
  [2026-10-26 ADR-0043 결정 1·2] 메뉴 단계를 걷었다 — 마법사는 게시판만 만들고(BBS_MST_CREATE 하나), 메뉴는 결과 화면이나 운영 화면의
  '메뉴에 붙이기'로 메뉴 관리에 넘긴다(메뉴 저장 권한은 메뉴 관리의 구조 저장이 집행한다). 공개는 결과 화면의 '지금 사용으로 바꾸기'로 한다.
  단계는 용도·기본정보 → 화면·기능 → 최종 확인 셋이다.
*/
const STEPS = [
  { id: 1, title: '용도·기본정보', description: '용도를 고르고 게시판의 이름과 소개를 입력하세요', icon: Settings2 },
  { id: 2, title: '화면·기능', description: '화면 유형과 댓글·만족도·첨부를 정하세요', icon: Layout },
  { id: 3, title: '최종 확인', description: '만들 설정과 만든 직후의 상태를 확인하세요', icon: Rocket },
];

/** 게시판 관리 목록 — '만들기 취소'와 결과 화면의 목록 이동이 간다. */
const BOARD_MASTER_LIST_ROUTE = '/admin/community/boards/master';

/**
 * [2026-10-26 ADR-0043] 마법사의 요청은 실패를 화면 안(오류 상자)에서 사유와 함께 보인다 — 같은 실패를 전역 토스트로 한 번 더 띄우지
 * 않는다(DEC-OPS-184 실패 한 번에 알림 하나).
 */
const QUIET = { suppressErrorToast: true } as const;

/** 생성 응답을 받지 못했을 때 '방금 만든 게시판'으로 볼 만든 시각의 범위(서버·브라우저 시계 차이를 함께 품는다). */
const RECOVERY_WINDOW_MS = 10 * 60 * 1000;

/** 비밀글 정책 세 값(ADR-0040 결정 7). 어휘는 생성 스키마의 enum 이다. */
type PrivatePostPolicy = NonNullable<z.infer<typeof BoardMasterDtoSchema>['prvtPstPlcyCd']>;
/** 비밀글 정책 선택 항목 — 값마다 무엇이 달라지는지 함께 말한다(운영 화면 설정 탭과 같은 말). */
const PRIVATE_POST_POLICY_OPTIONS: Readonly<Record<PrivatePostPolicy, string>> = {
  NONE: '없음(작성 화면에 선택 없음)',
  OPTIONAL: '선택(글쓴이가 고름)',
  REQUIRED: '필수(늘 비밀글로 저장)',
};
const PRIVATE_POST_POLICY_SUMMARY: Readonly<Record<PrivatePostPolicy, string>> = { NONE: '없음', OPTIONAL: '선택', REQUIRED: '필수' };

/**
 * 용도 프리셋(설계서 §5.3 표). 용도는 사용자가 아직 직접 바꾸지 않은 칸만 채운다. 파일당 크기는 용도와 무관하게 비워 둔다(전역 상한).
 * 예약·고정·비밀글·추천 칸은 해당 배치(B1~B3)가 구현된 뒤에만 채운다 — [2026-10-23 B1] 예약 게시(공지형만 받음)를, [B2] 상단 고정
 * (공지형만 허용, 상한 5·기본 30일)을, [B3] 비밀글 정책(질의응답형만 선택)과 추천 받기(공지형만 받지 않음)를 채운다.
 */
const BOARD_PURPOSES = [
  { id: 'NOTICE', label: '공지형', tmpltId: 'TMPLT_LIST', ansYn: 'N', stsfdgYn: 'N', fileAtchPsbltyYn: 'Y', atchPsbltyFileQty: 3, rsvtPstgPsbltyYn: 'Y',
    upendFixPsbltyYn: 'Y', upendFixUplmtNocs: 5, upendFixBscDayCnt: 30, prvtPstPlcyCd: 'NONE', rcmdtnUseYn: 'N' },
  { id: 'ARCHIVE', label: '자료실형', tmpltId: 'TMPLT_LIST', ansYn: 'Y', stsfdgYn: 'Y', fileAtchPsbltyYn: 'Y', atchPsbltyFileQty: 10, rsvtPstgPsbltyYn: 'N',
    upendFixPsbltyYn: 'N', upendFixUplmtNocs: 5, upendFixBscDayCnt: 30, prvtPstPlcyCd: 'NONE', rcmdtnUseYn: 'Y' },
  { id: 'FREE', label: '자유형', tmpltId: 'TMPLT_LIST', ansYn: 'Y', stsfdgYn: 'N', fileAtchPsbltyYn: 'Y', atchPsbltyFileQty: 3, rsvtPstgPsbltyYn: 'N',
    upendFixPsbltyYn: 'N', upendFixUplmtNocs: 5, upendFixBscDayCnt: 30, prvtPstPlcyCd: 'NONE', rcmdtnUseYn: 'Y' },
  { id: 'QNA', label: '질의응답형', tmpltId: 'TMPLT_QNA', ansYn: 'Y', stsfdgYn: 'Y', fileAtchPsbltyYn: 'Y', atchPsbltyFileQty: 3, rsvtPstgPsbltyYn: 'N',
    upendFixPsbltyYn: 'N', upendFixUplmtNocs: 5, upendFixBscDayCnt: 30, prvtPstPlcyCd: 'OPTIONAL', rcmdtnUseYn: 'Y' },
] as const satisfies readonly {
  id: string; label: string; tmpltId: BoardTemplateId; ansYn: 'Y' | 'N'; stsfdgYn: 'Y' | 'N'; fileAtchPsbltyYn: 'Y' | 'N'; atchPsbltyFileQty: number;
  rsvtPstgPsbltyYn: 'Y' | 'N'; upendFixPsbltyYn: 'Y' | 'N'; upendFixUplmtNocs: number; upendFixBscDayCnt: number;
  prvtPstPlcyCd: PrivatePostPolicy; rcmdtnUseYn: 'Y' | 'N';
}[];
type BoardPurpose = (typeof BOARD_PURPOSES)[number];
type PurposeField = 'tmpltId' | 'ansYn' | 'stsfdgYn' | 'fileAtchPsbltyYn' | 'atchPsbltyFileQty' | 'rsvtPstgPsbltyYn'
  | 'upendFixPsbltyYn' | 'upendFixUplmtNocs' | 'upendFixBscDayCnt' | 'prvtPstPlcyCd' | 'rcmdtnUseYn';
/**
 * [2026-10-26 ADR-0043 WIZ-10] 용도가 채우는 칸과 그 화면 이름. 순서는 2단계 화면의 순서다 — 용도를 고르면 직접 바꾼 칸을 이 이름으로
 * 알린다. 이름은 2단계의 칸 이름과 같게 둔다.
 */
const PURPOSE_FIELD_LABELS: ReadonlyArray<readonly [PurposeField, string]> = [
  ['tmpltId', '화면 유형'],
  ['ansYn', '댓글 받기'],
  ['stsfdgYn', '만족도 평가 받기'],
  ['fileAtchPsbltyYn', '파일 첨부 허용'],
  ['rsvtPstgPsbltyYn', '예약 게시 받기'],
  ['upendFixPsbltyYn', '상단 고정 받기'],
  ['rcmdtnUseYn', '추천 받기'],
  ['atchPsbltyFileQty', '첨부 파일 수'],
  ['upendFixUplmtNocs', '상단 고정 상한'],
  ['upendFixBscDayCnt', '상단 고정 기본 일수'],
  ['prvtPstPlcyCd', '비밀글 정책'],
];
const BYTES_PER_MB = 1024 * 1024;

/*
  [2026-10-16 GAP-BOARD-002, DEC-OPS-332] 유형 코드·템플릿·이름·설명의 정본은 게시판 유형 표(lib/board/board-types)다.
  종전에는 이 파일이 BBST01~ 과 이름을 손으로 들고 있었고, 서버는 같은 이름을 없는 공통코드 COM004 에서 찾았다.
  여기에는 카드의 아이콘·색만 둔다 — 표에 템플릿이 늘면 이 표가 빠진 항목을 타입 검사로 잡는다.
*/
const TEMPLATE_PRESENTATION = {
  TMPLT_HUB: { icon: BookOpen, color: 'bg-primary text-primary-foreground' },
  TMPLT_LIST: { icon: List, color: 'bg-success text-success-foreground' },
  TMPLT_GALLERY: { icon: ImageIcon, color: 'bg-destructive text-destructive-foreground' },
  TMPLT_QNA: { icon: HelpCircle, color: 'bg-warning text-warning-foreground' },
  TMPLT_CALENDAR: { icon: CalendarDays, color: 'bg-info text-info-foreground' },
  TMPLT_FAQ: { icon: MessageSquare, color: 'bg-primary text-primary-foreground' },
  TMPLT_WIKI: { icon: Book, color: 'bg-surface-inverse text-surface-inverse-foreground' },
} satisfies Record<BoardTemplateId, { icon: LucideIcon; color: string }>;

const TEMPLATES = BOARD_TYPES.map((type) => ({
  id: type.templateId,
  name: type.name,
  description: type.description,
  typeCode: type.code,
  ...TEMPLATE_PRESENTATION[type.templateId],
}));

// [2026-10-26 ADR-0043 결정 5] 화면 유형 이름은 정본 함수 하나(board-types)가 템플릿으로 정한다.
const templateName = (templateId: string | undefined) => boardTemplateName(templateId);
const yesNo = (value: string | undefined, yes = '받음', no = '받지 않음') => (value === 'N' ? no : yes);

/** [WIZ-10] 용도가 무엇을 채우는지 한 줄로 — 프리셋 값에서 만들어 표와 갈리지 않는다. */
function describePurpose(preset: BoardPurpose): string {
  return [
    `화면 유형 ${templateName(preset.tmpltId)}`,
    `댓글 ${yesNo(preset.ansYn)}`,
    `만족도 ${yesNo(preset.stsfdgYn)}`,
    `추천 ${yesNo(preset.rcmdtnUseYn)}`,
    `첨부 ${preset.fileAtchPsbltyYn === 'Y' ? `${preset.atchPsbltyFileQty}개` : '허용 안 함'}`,
    `예약 게시 ${yesNo(preset.rsvtPstgPsbltyYn)}`,
    `상단 고정 ${preset.upendFixPsbltyYn === 'Y' ? `허용(${preset.upendFixUplmtNocs}건·${preset.upendFixBscDayCnt}일)` : '허용 안 함'}`,
    `비밀글 ${PRIVATE_POST_POLICY_SUMMARY[preset.prvtPstPlcyCd]}`,
  ].join(' · ');
}

import { BoardMasterDtoSchema } from '@/types/generated-zod';
import { boardMasterKeys, invalidateBoardCaches } from '@/queries/board-master-query-options';
import { SERVER_MAX_FILE_SIZE_MB, SERVER_MAX_FILES_PER_REQUEST } from '@/lib/attachments/server-upload-limits';
import { boardOperationsHref } from '../../master/board-operations-tabs';
import { generatedRange, pinCountSchema } from '../../master/board-pin-count';
import { useAuth } from '@/contexts/AuthContext';
import { canOpenPage } from '@/lib/auth/page-access';
import { canPermission } from '@/lib/auth/permissions';

// [2026-10-23 ADR-0040 결정 5] 상단 고정 상한·기본 일수의 범위는 생성 스키마(서버 @Min·@Max)에서 온다 — 화면 상수를 두지 않는다.
const PIN_LIMIT_GENERATED = BoardMasterDtoSchema.shape.upendFixUplmtNocs.unwrap();
const PIN_DAYS_GENERATED = BoardMasterDtoSchema.shape.upendFixBscDayCnt.unwrap();
const PIN_LIMIT_RANGE = generatedRange(PIN_LIMIT_GENERATED);
const PIN_DAYS_RANGE = generatedRange(PIN_DAYS_GENERATED);

export const boardMakerFormSchema = BoardMasterDtoSchema.extend({
  bbsTtl: BoardMasterDtoSchema.shape.bbsTtl
    .trim()
    .min(2, '게시판 명칭을 2자 이상 입력해 주세요.')
    .max(100, '게시판 명칭은 최대 100자까지 입력할 수 있습니다.'),
  bbsExpln: BoardMasterDtoSchema.shape.bbsExpln
    .unwrap()
    .trim()
    .max(4000, '게시판 소개는 최대 4,000자까지 입력할 수 있습니다.'),
  atchPsbltyFileQty: z.number({ message: '첨부 파일 수를 숫자로 입력해 주세요.' })
    .int('첨부 파일 수는 정수여야 합니다.')
    .min(0, '첨부 파일 수는 0 이상이어야 합니다.')
    .max(SERVER_MAX_FILES_PER_REQUEST, `서버는 한 번에 ${SERVER_MAX_FILES_PER_REQUEST}개까지 받습니다.`),
  // 0 은 게시판 상한 없음(서버 전역 상한만 적용)이다.
  atchPsbltyFileSz: z.number({ message: '파일당 크기를 숫자로 입력해 주세요.' })
    .int('첨부 가능 파일 크기는 정수여야 합니다.')
    .min(0, '파일당 크기는 0 이상이어야 합니다.')
    .max(SERVER_MAX_FILE_SIZE_MB * BYTES_PER_MB, `서버는 파일 하나당 ${SERVER_MAX_FILE_SIZE_MB}MB 까지 받습니다.`),
  tmpltId: BoardMasterDtoSchema.shape.tmpltId,
  // [2026-10-23 ADR-0040 결정 5·6] 상단 고정 상한·기본 일수. 범위는 서버 @Min·@Max 가 생성 스키마로 내려온 값이고, 비우면 서버 기본값이라
  //   생성 스키마처럼 선택이다(마법사는 늘 채워 보낸다).
  upendFixUplmtNocs: pinCountSchema({ subject: '상단 고정 상한은', object: '상단 고정 상한을' }, '건', PIN_LIMIT_GENERATED).optional(),
  upendFixBscDayCnt: pinCountSchema({ subject: '상단 고정 기본 일수는', object: '상단 고정 기본 일수를' }, '일', PIN_DAYS_GENERATED).optional(),
  /*
    [2026-09-08 PD-CMTY-001] 커뮤니티 귀속(선택).

    값이 있으면 그 게시판은 **회원 전용**이 된다 — 승인된 회원과 관리자만 목록·상세·댓글·
    작성에 접근한다(BoardService.assertCommunityAccess). 빈 문자열은 '귀속 없음' 이며 서버에
    보내지 않는다.

    ⚠ 귀속은 **생성 시점에만** 정한다. 나중에 바꾸면 이미 쌓인 글의 열람 범위가 통째로
    달라지는데(H3 — 인가 의미 변경), 그것은 별도 결정이 필요한 일이다. 서버의
    updateBoardMaster 도 cmntySn 을 건드리지 않는다.
  */
  cmntySn: z.string().optional(),
});

type FormValues = z.infer<typeof boardMakerFormSchema>;

const BOARD_MAKER_FORM_LABELS: Record<string, string> = {
  bbsTtl: '게시판 명칭',
  bbsExpln: '게시판 소개',
  tmpltId: '화면 유형',
  atchPsbltyFileQty: '첨부 파일 수',
  atchPsbltyFileSz: '파일당 크기',
  rsvtPstgPsbltyYn: '예약 게시',
  upendFixPsbltyYn: '상단 고정 허용',
  upendFixUplmtNocs: '상단 고정 상한',
  upendFixBscDayCnt: '상단 고정 기본 일수',
  prvtPstPlcyCd: '비밀글 정책',
  rcmdtnUseYn: '추천 받기',
  cmntySn: '커뮤니티 귀속',
  'root.server': '저장 오류',
};

const BOARD_MAKER_FIELD_STEPS: Record<string, number> = {
  bbsTtl: 1,
  bbsExpln: 1,
  cmntySn: 1,
  tmpltId: 2,
  atchPsbltyFileQty: 2,
  atchPsbltyFileSz: 2,
  rsvtPstgPsbltyYn: 2,
  upendFixPsbltyYn: 2,
  upendFixUplmtNocs: 2,
  upendFixBscDayCnt: 2,
  prvtPstPlcyCd: 2,
  rcmdtnUseYn: 2,
};

/** 만든 게시판(결과 화면의 대상). communityBound 는 커뮤니티 귀속 여부다 — 입구가 커뮤니티 화면이라 메뉴 안내를 건너뛴다(결정 1). */
interface CreatedBoard {
  bbsId: string;
  bbsTtl: string;
  communityBound: boolean;
  inUse: boolean;
}

/**
 * [2026-10-26 WIZ-15] 생성 응답을 받지 못했을 때 같은 이름으로 방금 만든 게시판을 찾은 결과. 찾으면 그 게시판으로 이어 가자고
 * 제안한다 — 다시 만들면 같은 게시판이 하나 더 생긴다.
 */
type Recovery =
  | { status: 'searching' }
  | { status: 'found'; board: BoardMasterSummary }
  | { status: 'none' }
  | { status: 'failed' }
  | { status: 'unavailable' };

/** 응답의 HTTP 상태. 응답이 없으면(연결 끊김·시간 초과) null 이다. */
function responseStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const response = (error as { response?: { status?: unknown } }).response;
  return typeof response?.status === 'number' ? response.status : null;
}

/** 쓰기 결과를 모르는가 — 응답이 없거나 서버 오류(5xx)면 서버에 반영됐을 수 있다(게시판 생성·사용 전환). 4xx 는 서버가 거부한 확정 결과다. */
function writeOutcomeUnknown(error: unknown): boolean {
  const status = responseStatus(error);
  return status === null || status >= 500;
}

/** 목록 응답의 만든 시각(시간대 표기 없는 서버 현지 시각 = Asia/Seoul)을 epoch 밀리초로. 해석할 수 없으면 null. */
function seoulEpoch(value: string | null | undefined): number | null {
  const raw = value?.trim();
  if (!raw) return null;
  const iso = raw.replace(' ', 'T');
  const time = Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso) ? iso : `${iso}+09:00`);
  return Number.isNaN(time) ? null : time;
}

/** 만든 시각 표시('yyyy-MM-dd HH:mm:ss'). 서버 현지 시각 문자열을 그대로 자른다. */
function displayCreatedAt(value: string | null | undefined): string {
  const match = value?.trim().match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/);
  return match ? `${match[1]} ${match[2]}` : '알 수 없음';
}

/**
 * 방금 만든 것으로 볼 게시판 — 이름·화면 유형이 같고, 사용 안 함이며, 만든 시각이 지금에서 RECOVERY_WINDOW_MS 안이다. 만든 시각을 해석할
 * 수 없으면 고르지 않는다(추정으로 남의 게시판을 이어 가지 않는다).
 */
export function findJustCreatedBoard(
  list: readonly BoardMasterSummary[],
  draft: { bbsTtl: string; tmpltId: string; cmntySn?: number | null },
  now: number = Date.now(),
): BoardMasterSummary | null {
  return list.find((board) => {
    if (board.bbsTtl !== draft.bbsTtl || board.tmpltId !== draft.tmpltId || board.useYn !== 'N') return false;
    // 귀속 커뮤니티도 같아야 한다 — 같은 이름·유형이라도 귀속이 다르면 이 마법사가 만든 게시판이 아니다.
    if ((board.community?.cmntySn ?? null) !== (draft.cmntySn ?? null)) return false;
    const createdAt = seoulEpoch(board.crtDt);
    return createdAt !== null && Math.abs(now - createdAt) <= RECOVERY_WINDOW_MS;
  }) ?? null;
}

export function BoardMakerWizard() {
  const router = useRouter();
  const confirm = useConfirm();
  const { toast } = useToast();
  // [2026-09-26 DIP B4 P1] 게시판을 만들 수 있다고 메뉴·권한 화면에 들어갈 수 있는 것은 아니다.
  //   다른 화면으로 가는 길은 라우트 게이트와 같은 판정으로만 보인다.
  const { user } = useAuth();
  const canOpenMenus = canOpenPage(user, '/admin/system/menus');
  const canOpenBoardMasters = canOpenPage(user, BOARD_MASTER_LIST_ROUTE);
  // [2026-10-23 ADR-0040 §5.3] 결과 화면의 주 동작은 운영 화면(게시판 관리 조회 권한)이다. 마법사 진입 권한이 그것을 함축하지 않는다.
  const canOpenBoardOperations = canOpenPage(user, '/admin/community/boards/master/[id]');
  const canOpenAuthority = canOpenPage(user, '/admin/security/authority');
  // [2026-10-26 ADR-0043 결정 1] 마법사는 게시판만 만든다 — 필요한 권한은 게시판 만들기(BBS_MST_CREATE) 하나다. 메뉴 권한이 없는
  //   게시판 운영 담당자도 게시판을 만든다. 표시 판정일 뿐이며 서버 인가는 그대로 집행된다(H3).
  const canCreateBoard = canPermission(user, 'BBS_MST_CREATE');
  // 결과 화면의 갈래(표시 판정). 사용 전환은 기존 사용 상태 바꾸기 경로(BBS_MST_UPDATE)다(결정 2). 메뉴에 붙이기는 메뉴 관리의 새 메뉴
  //   추가와 저장(MENU_CREATE·MENU_UPDATE)을 할 수 있을 때만 넘긴다 — 그룹 표시(AUTHRT_GRANT)는 메뉴 관리가 따로 판정한다.
  const canSwitchBoardUse = canPermission(user, 'BBS_MST_UPDATE');
  const canAttachMenu = canOpenMenus && canPermission(user, 'MENU_CREATE') && canPermission(user, 'MENU_UPDATE');
  // [WIZ-15] 생성 결과를 모를 때 같은 이름의 게시판을 찾는 목록 조회(BBS_MST_READ). 없으면 찾지 않고 목록 확인을 안내한다.
  const canReadBoardMasters = canPermission(user, 'BBS_MST_READ');
  const missingPermissionReason = !canCreateBoard ? '게시판을 만들 권한이 없습니다.' : null;
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = React.useRef(false);
  const [createdBoard, setCreatedBoard] = useState<CreatedBoard | null>(null);
  // 감사 P1-1/삼킴 금지: 배포 실패 시 status 문자열만 바꿨는데 그 문자열은 isSubmitting 중에만 렌더돼
  // 제출이 끝나는 순간 사라졌다(= 실패가 화면에 전혀 남지 않음). 별도 상태로 오류를 계속 노출한다.
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitErrorRef = React.useRef<HTMLDivElement>(null);
  const [recovery, setRecovery] = useState<Recovery | null>(null);
  const [switchPending, setSwitchPending] = useState(false);
  const switchingRef = React.useRef(false);
  const [menuHandoffFailed, setMenuHandoffFailed] = useState(false);
  const queryClient = useQueryClient();
  const [purpose, setPurpose] = useState<string>('');
  const [purposeNotice, setPurposeNotice] = useState('');
  // 사용자가 직접 바꾼 칸 — 용도를 바꿔도 덮지 않는다(§5.3).
  const touchedRef = React.useRef(new Set<PurposeField>());

  const form = useAppForm<typeof boardMakerFormSchema>(boardMakerFormSchema, {
    defaultValues: {
      bbsTtl: '',
      bbsExpln: '',
      atchPsbltyFileQty: 3,
      // 비우면(0) 게시판 상한 없이 서버 전역 상한만 적용한다(설계서 §5.3 — 용도와 무관하게 비워 둔다).
      atchPsbltyFileSz: 0,
      // [2026-09-27 DIP B5 F9] 댓글·만족도·첨부 설정은 이제 서버가 집행한다. 기본값은 지금까지의 실제 동작(받음)이다.
      ansYn: 'Y',
      stsfdgYn: 'Y',
      fileAtchPsbltyYn: 'Y',
      // [2026-10-23 ADR-0040 결정 3·6] 예약 게시는 기존 게시판 기본값(받지 않음)으로 시작한다 — 공지형 용도만 켠다.
      rsvtPstgPsbltyYn: 'N',
      // [2026-10-23 ADR-0040 결정 5·6] 상단 고정도 기존 게시판 기본값(허용 안 함 · 5건 · 30일)으로 시작한다 — 공지형 용도만 켠다.
      upendFixPsbltyYn: 'N',
      upendFixUplmtNocs: 5,
      upendFixBscDayCnt: 30,
      // [2026-10-23 ADR-0040 결정 6·7] 비밀글 정책·추천 받기도 기존 게시판 기본값(없음·받음)으로 시작한다 — 질의응답형은 선택,
      //   공지형은 추천을 받지 않는다.
      prvtPstPlcyCd: 'NONE',
      rcmdtnUseYn: 'Y',
      bbsTypeCd: DEFAULT_BOARD_TYPE.code,
      bbsAtrbCd: 'BBSA01',
      tmpltId: DEFAULT_BOARD_TYPE.templateId,
      // [2026-10-23 ADR-0040 결정 1·§5.3] 사용 안 함으로 만든다 — 공개 준비를 마친 뒤 사용으로 바꾼다.
      useYn: 'N',
      cmntySn: '',
    }
  }, {
    revealField: async (fieldName) => {
      const targetStep = BOARD_MAKER_FIELD_STEPS[fieldName];
      if (targetStep) setCurrentStep(targetStep);
    },
  });
  const { register, handleSubmit, formState: { errors, isDirty }, watch, setValue } = form;
  useUnsavedChanges(() => ({
    dirty: createdBoard === null && isDirty,
    pending: submittingRef.current || switchingRef.current,
  }));

  /*
    [2026-09-08 PD-CMTY-001] 귀속 후보 목록. 관리자 화면이므로 관리자용 목록을 쓴다
    (사용 중지된 커뮤니티도 포함되지만, 그런 커뮤니티에 새 게시판을 붙일 이유가 없어
    사용 중인 것만 후보로 둔다).
  */
  /* reusable-base:community:start */
  const { data: communities } = useQuery({
    queryKey: ['board-maker-communities'],
    queryFn: () => communityUserService.getCommunityList({ page: 1, size: 100 }),
  });
  const communityOptions = (communities?.list ?? []).filter((community) => community.useYn === 'Y');
  /* reusable-base:community:end */

  const selectedTemplate = watch('tmpltId');
  const bbsTtl = watch('bbsTtl');
  const bbsExpln = watch('bbsExpln');

  const setTemplate = (templateId: BoardTemplateId) => {
    const type = BOARD_TYPES.find((candidate) => candidate.templateId === templateId);
    if (!type) return;
    setValue('tmpltId', type.templateId, { shouldDirty: true });
    setValue('bbsTypeCd', type.code, { shouldDirty: true });
  };
  const touch = (field: PurposeField) => { touchedRef.current.add(field); };
  /**
   * 용도를 고르면 아직 직접 바꾸지 않은 칸만 채운다. 고르지 않음이면 아무것도 바꾸지 않는다.
   * [2026-10-26 WIZ-10] 무엇을 채웠고 무엇을 남겼는지 바로 알린다 — 종전에는 조용히 값만 바꿔, 2단계를 지나치면 모르는 사이에
   *   예약·고정·추천 설정이 정해졌다.
   */
  const applyPurpose = (id: string) => {
    setPurpose(id);
    const preset = BOARD_PURPOSES.find((candidate) => candidate.id === id);
    if (!preset) {
      setPurposeNotice('용도를 고르지 않았습니다. 지금 칸의 값은 그대로입니다.');
      return;
    }
    const touched = touchedRef.current;
    if (!touched.has('tmpltId')) setTemplate(preset.tmpltId);
    if (!touched.has('ansYn')) setValue('ansYn', preset.ansYn, { shouldDirty: true });
    if (!touched.has('stsfdgYn')) setValue('stsfdgYn', preset.stsfdgYn, { shouldDirty: true });
    if (!touched.has('fileAtchPsbltyYn')) setValue('fileAtchPsbltyYn', preset.fileAtchPsbltyYn, { shouldDirty: true });
    if (!touched.has('atchPsbltyFileQty')) setValue('atchPsbltyFileQty', preset.atchPsbltyFileQty, { shouldDirty: true });
    if (!touched.has('rsvtPstgPsbltyYn')) setValue('rsvtPstgPsbltyYn', preset.rsvtPstgPsbltyYn, { shouldDirty: true });
    if (!touched.has('upendFixPsbltyYn')) setValue('upendFixPsbltyYn', preset.upendFixPsbltyYn, { shouldDirty: true });
    if (!touched.has('upendFixUplmtNocs')) setValue('upendFixUplmtNocs', preset.upendFixUplmtNocs, { shouldDirty: true });
    if (!touched.has('upendFixBscDayCnt')) setValue('upendFixBscDayCnt', preset.upendFixBscDayCnt, { shouldDirty: true });
    if (!touched.has('prvtPstPlcyCd')) setValue('prvtPstPlcyCd', preset.prvtPstPlcyCd, { shouldDirty: true });
    if (!touched.has('rcmdtnUseYn')) setValue('rcmdtnUseYn', preset.rcmdtnUseYn, { shouldDirty: true });
    const kept = PURPOSE_FIELD_LABELS.filter(([field]) => touched.has(field)).map(([, label]) => label);
    setPurposeNotice(kept.length > 0
      ? `직접 바꾼 항목(${kept.join(', ')})은 그대로 두고 나머지를 ${preset.label} 추천값으로 채웠습니다.`
      : `화면 유형과 기능 칸을 ${preset.label} 추천값으로 채웠습니다.`);
  };
  const fileSizeBytes = Number(watch('atchPsbltyFileSz'));
  const attachmentSummary = watch('fileAtchPsbltyYn') === 'N'
    ? '허용 안 함'
    : `허용(${Number(watch('atchPsbltyFileQty')) === 0 ? '개수 상한 없음' : `${watch('atchPsbltyFileQty')}개까지`} · 파일당 ${fileSizeBytes > 0 ? `${fileSizeBytes / BYTES_PER_MB}MB` : `전역 상한 ${SERVER_MAX_FILE_SIZE_MB}MB`})`;
  // 미리보기는 새로 받는 기능과 누적 수 표시를 구별하고, 실제 조회·변경 없이 예시를 그린다.
  const previewFeatures: BoardPreviewFeatures = {
    comments: watch('ansYn') !== 'N',
    recommendations: watch('rcmdtnUseYn') !== 'N',
    satisfaction: watch('stsfdgYn') !== 'N',
    attachments: {
      allowed: watch('fileAtchPsbltyYn') !== 'N',
      maxFiles: Number(watch('atchPsbltyFileQty')) || 0,
      maxFileBytes: fileSizeBytes > 0 ? fileSizeBytes : 0,
    },
    privatePostPolicy: watch('prvtPstPlcyCd') ?? 'NONE',
    reservation: watch('rsvtPstgPsbltyYn') === 'Y',
    pinning: watch('upendFixPsbltyYn') === 'Y',
  };

  React.useEffect(() => {
    if (!submitError || !submitErrorRef.current) return;
    submitErrorRef.current.scrollIntoView?.({ behavior: 'auto', block: 'center' });
    submitErrorRef.current.focus({ preventScroll: true });
  }, [submitError]);

  const handleNextStep = async () => {
    const fields: Array<keyof FormValues> = currentStep === 1
      ? ['bbsTtl', 'bbsExpln']
      : currentStep === 2
        ? ['tmpltId', 'atchPsbltyFileQty', 'atchPsbltyFileSz', 'upendFixUplmtNocs', 'upendFixBscDayCnt']
        : [];
    const isValid = fields.length === 0 || await form.trigger(fields);
    if (!isValid) {
      const firstInvalid = fields.find((field) => form.getFieldState(field).invalid);
      if (firstInvalid) await form.focusError(firstInvalid);
      return;
    }
    setSubmitError(null);
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  };
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));
  // [2026-10-26 ADR-0043] 만들기 취소 — 목록으로 간다. 라우터 이동은 미저장 보호(useUnsavedChanges)를 거친다.
  const cancelWizard = () => {
    if (canOpenBoardMasters) router.push(BOARD_MASTER_LIST_ROUTE);
    else router.back();
  };

  /** [WIZ-15] 생성 결과를 모를 때 같은 이름으로 방금 만든 게시판을 목록에서 찾는다. 목록을 볼 수 없으면 찾지 않는다. */
  const searchJustCreated = async (draft: { bbsTtl: string; tmpltId: string; cmntySn: number | null }) => {
    if (!canReadBoardMasters) {
      setRecovery({ status: 'unavailable' });
      return;
    }
    setRecovery({ status: 'searching' });
    try {
      const page = await boardAdminService.getBoardMasterList({ searchKeyword: draft.bbsTtl, searchUseYn: 'N', page: 1, size: 20 }, QUIET);
      const board = findJustCreatedBoard(page.list, draft);
      setRecovery(board ? { status: 'found', board } : { status: 'none' });
    } catch {
      setRecovery({ status: 'failed' });
    }
  };

  const continueWithFound = (board: BoardMasterSummary) => {
    void queryClient.invalidateQueries({ queryKey: boardMasterKeys.lists() });
    setSubmitError(null);
    setRecovery(null);
    // 귀속은 지금 폼 값이 아니라 찾은 게시판의 값이다 — 찾은 뒤 이전 단계에서 귀속을 바꿔도 결과 화면이 틀리지 않는다.
    setCreatedBoard({ bbsId: board.bbsId, bbsTtl: board.bbsTtl, communityBound: board.community != null, inUse: board.useYn === 'Y' });
  };

  const onSubmit = async (data: FormValues) => {
    if (submittingRef.current) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    setRecovery(null);

    try {
      const bbsId = await boardAdminService.createBoardMaster({
        bbsTtl: data.bbsTtl,
        bbsExpln: data.bbsExpln,
        bbsTypeCd: data.bbsTypeCd,
        bbsAtrbCd: 'BBSA01', // Missing field causing 500 error
        // [2026-08-29] 종전 토글은 저장될 뿐 집행자가 없어 걷어냈다. [2026-09-27 DIP B5 F9] 서버가 댓글(ansYn)·
        //   만족도(stsfdgYn)·첨부(fileAtchPsbltyYn·파일 수·크기)를 집행하므로 토글을 되살린다.
        //   답글 가능 여부(ansPsbltyYn)는 여전히 집행자가 없어 기본값으로 둔다.
        ansPsbltyYn: 'N',
        ansYn: data.ansYn ?? 'Y',
        stsfdgYn: data.stsfdgYn ?? 'Y',
        fileAtchPsbltyYn: data.fileAtchPsbltyYn ?? 'Y',
        atchPsbltyFileQty: Number(data.atchPsbltyFileQty),
        atchPsbltyFileSz: Number(data.atchPsbltyFileSz),
        tmpltId: data.tmpltId,
        // [2026-10-23 ADR-0040 결정 3·6] 예약 게시(새 미래 시작일을 받을지). 커뮤니티 마커 블록 앞에 둔다 — 투영에서 블록이 빠져도 남는다.
        rsvtPstgPsbltyYn: data.rsvtPstgPsbltyYn === 'Y' ? 'Y' : 'N',
        // [2026-10-23 ADR-0040 결정 5·6] 상단 고정 허용·상한·기본 일수. 같은 이유로 커뮤니티 마커 블록 앞에 둔다.
        upendFixPsbltyYn: data.upendFixPsbltyYn === 'Y' ? 'Y' : 'N',
        upendFixUplmtNocs: Number(data.upendFixUplmtNocs),
        upendFixBscDayCnt: Number(data.upendFixBscDayCnt),
        // [2026-10-23 ADR-0040 결정 6·7] 비밀글 정책·추천 받기. 같은 이유로 커뮤니티 마커 블록 앞에 둔다(useYn 이 마지막이다).
        prvtPstPlcyCd: data.prvtPstPlcyCd ?? 'NONE',
        rcmdtnUseYn: data.rcmdtnUseYn === 'N' ? 'N' : 'Y',
        // [2026-09-08 PD-CMTY-001] 빈 값은 '귀속 없음' 이라 필드를 아예 보내지 않는다.
        //   서버는 없는 커뮤니티 귀속을 404 로 거부한다.
        /* reusable-base:community:start */
        ...(data.cmntySn ? { cmntySn: Number(data.cmntySn) } : {}),
        /* reusable-base:community:end */
        // [2026-10-23 ADR-0040 결정 1·§5.3] 사용 안 함으로 만든다 — 글을 준비한 뒤 결과 화면이나 운영 화면에서 사용으로 바꾼다.
        useYn: 'N'
      }, QUIET);

      // 식별자 없는 성공 응답은 결과를 모르는 것과 같다 — 아래 결과 모름 경로로 같은 이름의 게시판을 찾는다.
      if (!bbsId) throw new Error('board id missing');
      void queryClient.invalidateQueries({ queryKey: boardMasterKeys.lists() });
      // [2026-10-26 ADR-0043 결정 1] 메뉴는 만들지 않는다 — 결과 화면이 '메뉴에 붙이기'로 메뉴 관리에 넘긴다.
      setCreatedBoard({ bbsId, bbsTtl: data.bbsTtl, communityBound: Boolean(data.cmntySn), inUse: false });
    } catch (error: unknown) {
      const serverErrors = extractFieldErrors(error);
      if (serverErrors && Object.keys(serverErrors).length > 0) {
        let firstNavigableField: string | null = null;
        for (const [serverField, message] of Object.entries(serverErrors)) {
          const fieldName = Object.prototype.hasOwnProperty.call(BOARD_MAKER_FIELD_STEPS, serverField) ? serverField : 'root.server';
          form.setError(fieldName as never, { type: 'server', message });
          if (!firstNavigableField && fieldName !== 'root.server') firstNavigableField = fieldName;
        }
        if (firstNavigableField) void form.focusError(firstNavigableField, 'server');
      } else if (!form.applyServerErrors(error)) {
        // [2026-10-26 WIZ-03·15] 서버 사유를 화면 문구로도 보인다. 결과를 모르면(응답 없음·5xx) 같은 이름으로 방금 만든 게시판을 찾는다.
        const reason = responseStatus(error) === null ? undefined : userFacingErrorMessage(error);
        const detail = reason ? ` ${reason}` : '';
        if (writeOutcomeUnknown(error)) {
          setSubmitError(`게시판 생성 결과를 확인하지 못했습니다.${detail} 입력값은 유지됩니다.`);
          // 찾기가 끝날 때까지 제출 잠금을 유지한다 — '확인하는 중'에 다시 만들면 같은 게시판이 하나 더 생긴다.
          await searchJustCreated({ bbsTtl: data.bbsTtl, tmpltId: data.tmpltId, cmntySn: data.cmntySn ? Number(data.cmntySn) : null });
        } else {
          setSubmitError(`게시판을 만들지 못했습니다.${detail} 입력값은 유지됩니다.`);
        }
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  /**
   * [2026-10-26 ADR-0043 결정 2] 지금 사용으로 바꾸기. 기존 사용 상태 바꾸기 경로(BBS_MST_UPDATE, 변경 이력·버전)를 쓴다 — 마법사가
   * 사용 중으로 만들지 않는다(ADR-0040 결정 1). 이용자에게 여는 동작이라 확인을 거친다.
   */
  const switchBoardToUse = async () => {
    if (!createdBoard || switchingRef.current) return;
    const { bbsId, bbsTtl: name, communityBound } = createdBoard;
    const confirmed = await confirm({
      title: '게시판 사용으로 바꾸기',
      message: communityBound
        ? `'${name}' 게시판을 사용으로 바꿉니다. 귀속 커뮤니티의 승인 회원과 관리자가 이 게시판을 열고 글을 쓸 수 있게 됩니다.`
        : `'${name}' 게시판을 사용으로 바꿉니다. 게시글 권한이 있는 로그인 사용자는 누구나 주소·통합 검색·게시판 선택지로 이 게시판을 열고 글을 쓸 수 있게 됩니다.`,
      confirmText: '사용으로 바꾸기',
      details: (
        <ul className="list-disc space-y-1 pl-5 text-[length:var(--font-size-body)]">
          <li>{communityBound
            ? '이 게시판의 입구는 커뮤니티 화면입니다. 메뉴를 따로 붙이지 않습니다.'
            : '메뉴는 따로 붙입니다. 메뉴는 길 안내일 뿐이라 메뉴가 없어도 위 경로로 열립니다.'}</li>
          <li>되돌리려면 운영 화면 설정 탭이나 게시판 목록에서 사용 안 함으로 바꿉니다.</li>
        </ul>
      ),
      detailsLabel: '사용으로 바꾸면 달라지는 것',
    });
    if (!confirmed) return;
    switchingRef.current = true;
    setSwitchPending(true);
    try {
      await boardAdminService.batchUpdateBoardMasterStatus([bbsId], 'Y');
      setCreatedBoard((current) => (current && current.bbsId === bbsId ? { ...current, inUse: true } : current));
      toast(`'${name}' 게시판을 사용으로 바꿨습니다.`, 'success');
      // 사용 여부는 목록만의 값이 아니다 — 운영 화면 상세·이용 화면 메타·선택지·변경 이력도 다시 읽는다.
      void invalidateBoardCaches(queryClient);
    } catch (error: unknown) {
      // 화면이 실패의 주인이다 — 전역 실패 알림을 이 문구로 바꾸고 서버 사유는 설명 줄에 싣는다(DEC-OPS-184).
      //   응답이 없거나 5xx 면 서버에서 바뀌었을 수 있다 — '그대로'라고 단정하지 않고 상태를 다시 읽는다(WIZ-15 와 같은 판정).
      if (writeOutcomeUnknown(error)) {
        toast('사용 전환 결과를 확인하지 못했습니다. 운영 화면에서 상태를 확인하거나 다시 시도하세요.', 'error');
        void invalidateBoardCaches(queryClient);
        // 결과 화면의 상태 줄이 틀리지 않게 서버 값을 다시 읽는다. 읽지 못하면 종전 표시를 둔다(위 알림이 확인하라고 말한다).
        try {
          const detail = await boardAdminService.getBoardMaster(bbsId, QUIET);
          setCreatedBoard((current) => (current && current.bbsId === bbsId ? { ...current, inUse: detail.useYn === 'Y' } : current));
        } catch { /* 재조회 실패는 위 알림으로 충분하다 */ }
      } else {
        toast('게시판을 사용으로 바꾸지 못했습니다. 게시판은 사용 안 함 그대로입니다.', 'error');
      }
    } finally {
      switchingRef.current = false;
      setSwitchPending(false);
    }
  };

  /**
   * [2026-10-26 ADR-0043 결정 1] 메뉴에 붙이기 — 게시판 이용 화면 주소와 이름, 돌아갈 곳을 메뉴 관리에 넘긴다. 메뉴 관리가 새 메뉴 위치
   * 고르기를 열고, 저장은 메뉴 관리의 구조 저장이 권한을 집행한다. 넘기지 못하면 이동하지 않고 주소를 직접 등록하도록 안내한다.
   */
  const attachMenu = () => {
    if (!createdBoard) return;
    const handedOff = handOffScreen({
      route: boardMenuRoute(createdBoard.bbsId),
      label: createdBoard.bbsTtl,
      returnTo: canOpenBoardOperations
        ? { route: boardOperationsHref(createdBoard.bbsId, 'access'), label: '게시판 공개 준비로 돌아가기' }
        : null,
    });
    if (!handedOff) {
      setMenuHandoffFailed(true);
      return;
    }
    router.push('/admin/system/menus');
  };

  const copyBoardAddress = async (route: string) => {
    try {
      await navigator.clipboard.writeText(route);
      toast('게시판 주소를 복사했습니다.', 'success');
    } catch {
      toast('주소를 복사하지 못했습니다. 직접 선택해 복사하세요.', 'error');
    }
  };

  /** 다른 게시판 만들기 — 새로 읽지 않고 처음 단계로 되돌린다. */
  const startOver = () => {
    form.reset();
    touchedRef.current = new Set();
    setPurpose('');
    setPurposeNotice('');
    setSubmitError(null);
    setRecovery(null);
    setMenuHandoffFailed(false);
    setCurrentStep(1);
    setCreatedBoard(null);
  };

  const breadcrumb = (
    <DynamicBreadcrumb
      customItems={[
        { name: '관리 센터' },
        { name: '콘텐츠 운영' },
        { name: '게시판 관리', href: canOpenBoardMasters ? BOARD_MASTER_LIST_ROUTE : undefined },
        { name: '게시판 만들기' },
      ]}
      currentLabel="게시판 만들기"
    />
  );

  if (createdBoard) {
    const { bbsId, bbsTtl: createdTitle, communityBound, inUse } = createdBoard;
    const menuRoute = boardMenuRoute(bbsId);
    const addressBlock = (
      <div className="flex flex-wrap items-center gap-2">
        <code className="break-all rounded bg-muted px-2 py-1 font-mono text-xs">{menuRoute}</code>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => void copyBoardAddress(menuRoute)}>
          <Copy className="size-4" aria-hidden="true" />
          주소 복사
        </Button>
      </div>
    );
    return (
      <div className="mx-auto mt-6 max-w-3xl space-y-4 text-left">
        {breadcrumb}
        <Card className="overflow-hidden rounded-md border border-border bg-card py-0 shadow-none">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-success text-success-foreground">
                <Check size={20} strokeWidth={3} aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-bold text-foreground">게시판 만들기 완료</h1>
                <p className="text-[length:var(--font-size-body)] text-muted-foreground">
                  게시판을 사용 안 함으로 만들었습니다. 메뉴는 만들지 않았습니다.
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-md border border-border p-4 text-[length:var(--font-size-body)] sm:grid-cols-[8rem_1fr]">
              <dt className="text-muted-foreground">게시판 이름</dt>
              <dd className="break-all text-foreground">{createdTitle}</dd>
              <dt className="text-muted-foreground">게시판 ID</dt>
              <dd className="break-all font-mono text-foreground">{bbsId}</dd>
              <dt className="text-muted-foreground">상태</dt>
              <dd className="text-foreground">
                <span role="status">
                  {inUse
                    ? communityBound
                      ? '사용 중 — 귀속 커뮤니티의 승인 회원에게 열려 있습니다'
                      : '사용 중 — 게시글 권한이 있는 로그인 사용자에게 열려 있습니다'
                    : '사용 안 함 — 이용자에게 닫혀 있습니다'}
                </span>
              </dd>
            </dl>

            {/* [2026-10-26 ADR-0043 결정 2, WIZ-04] 남은 일은 글 준비 → 사용 전환 → (선택) 메뉴 순서다 — 열리지 않는 게시판을 가리키는
                메뉴가 먼저 보이지 않게 한다. */}
            <section aria-labelledby="board-maker-next-steps" className="space-y-3">
              <h2 id="board-maker-next-steps" className="text-[length:var(--font-size-body)] font-semibold text-foreground">남은 일</h2>
              <ol className="list-decimal space-y-3 pl-5 text-[length:var(--font-size-body)] text-muted-foreground">
                <li>
                  <p className="font-medium text-foreground">글 준비</p>
                  <p>
                    이용자에게 열기 전에 첫 글이나 안내 글을 올려 둡니다. 사용 안 함인 동안에는 글 쓰기 권한과 게시물 조회 대행 권한(BOARD_READ_ALL)이
                    함께 있는 관리자만 글을 쓸 수 있습니다.
                  </p>
                </li>
                <li>
                  <p className="font-medium text-foreground">사용 전환</p>
                  {inUse ? (
                    <p>사용으로 바꿨습니다.</p>
                  ) : canSwitchBoardUse ? (
                    <div className="space-y-2">
                      <p>준비가 되면 사용으로 바꿉니다. 나중에 운영 화면 설정 탭에서 바꿔도 됩니다.</p>
                      <Button type="button" onClick={() => void switchBoardToUse()} disabled={switchPending} aria-busy={switchPending || undefined}>
                        {switchPending ? '사용으로 바꾸는 중…' : '지금 사용으로 바꾸기'}
                      </Button>
                    </div>
                  ) : (
                    <p>게시판을 사용으로 바꾸려면 게시판 관리 수정 권한(BBS_MST_UPDATE)이 있는 관리자에게 요청하세요.</p>
                  )}
                </li>
                <li>
                  <p className="font-medium text-foreground">(선택) 메뉴에 붙이기</p>
                  {communityBound ? (
                    <p>이 게시판의 입구는 커뮤니티 화면입니다. 승인 회원만 열 수 있어 메뉴를 따로 붙이지 않습니다.</p>
                  ) : canAttachMenu ? (
                    <div className="space-y-2">
                      <p>
                        메뉴는 길 안내일 뿐이라 없어도 사용 중인 게시판은 주소·통합 검색으로 열립니다. 메뉴 관리에서 위치를 고르고, 이용자 그룹에
                        보이도록 함께 저장합니다(그룹 표시는 권한 배정 권한이 필요합니다).
                      </p>
                      <Button type="button" variant="outline" onClick={attachMenu}>메뉴에 붙이기</Button>
                      {menuHandoffFailed && (
                        <div role="alert" className="space-y-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive-emphasis">
                          <p>메뉴 관리에 게시판을 넘기지 못했습니다. 브라우저 저장소를 쓸 수 없는 상태입니다. 메뉴 관리에서 새 메뉴를 추가하고 아래 주소를 직접 등록하세요.</p>
                          {addressBlock}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p>메뉴 연결은 메뉴 관리 권한이 있는 관리자에게 요청하세요. 요청할 때 아래 게시판 주소를 함께 전하세요.</p>
                      {addressBlock}
                    </div>
                  )}
                </li>
              </ol>
            </section>

            <div className="flex flex-wrap gap-2">
              {canOpenBoardOperations && (
                <Button onClick={() => router.push(boardOperationsHref(bbsId, 'access'))}>
                  운영 화면에서 공개 준비 계속하기
                </Button>
              )}
              {canOpenBoardMasters && (
                <Button variant="outline" onClick={() => router.push(BOARD_MASTER_LIST_ROUTE)}>
                  게시판 목록 보기
                </Button>
              )}
              <Button variant="ghost" onClick={startOver} className="text-muted-foreground hover:text-primary">
                다른 게시판 만들기
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-8 text-left">
      {breadcrumb}
      <h1 className="sr-only">게시판 만들기</h1>
      {/* 단계 표시 — 지금 단계는 aria-current="step" 으로 알린다(시각 표시만으로 전하지 않는다). */}
      <div className="relative px-4">
        <div className="absolute left-0 top-4 z-0 h-0.5 w-full bg-muted" aria-hidden="true" />
        <ol aria-label="게시판 만들기 단계" className="relative z-10 flex items-start justify-between">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <li key={step.id} aria-current={isActive ? 'step' : undefined} className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-md border transition-colors",
                    isActive ? "bg-primary border-primary text-primary-foreground" :
                      isCompleted ? "bg-success border-success text-success-foreground" :
                        "bg-card border-border text-muted-foreground"
                  )}
                >
                  {isCompleted ? <Check className="size-4" aria-hidden="true" /> : <Icon className="size-4" aria-hidden="true" />}
                </div>
                <div className="text-center">
                  <p className={cn("text-xs", isActive ? "text-primary" : "text-muted-foreground")}>
                    {step.id}단계{isCompleted && <span className="sr-only">(마침)</span>}
                  </p>
                  <p className={cn("whitespace-nowrap text-[length:var(--font-size-body)] font-medium", isActive ? "text-foreground" : "text-muted-foreground")}>
                    {step.title}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Main Content Card */}
      <Card className="overflow-hidden rounded-md border border-border bg-card py-0 shadow-none">
        {/* [2026-07-26] 프로덕션 코드에 남아 있던 디버그 로그 제거. 검증 실패는 폼 UI(필드별 메시지)가
     이미 사용자에게 알리므로 콘솔 출력은 정보 가치가 없다. 게다가 E2E 의 콘솔 오류 가드가 이를
     금지 로그로 잡아 테스트를 실패시켰다(Validation Edge Case: Creation Failure with Empty Name).
     진단이 필요하면 개발 모드 조건부로 출력할 것. */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FormErrorSummary
            errors={errors}
            labels={BOARD_MAKER_FORM_LABELS}
            onNavigate={form.focusError}
            className="mx-4 mt-4"
          />
          {submitError ? (
            <div className="mx-4 mt-4 space-y-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-[length:var(--font-size-body)]">
              <div
                ref={submitErrorRef}
                role="alert"
                tabIndex={-1}
                className="font-medium text-destructive-emphasis"
              >
                {submitError}
              </div>
              {recovery && (
                <div role="status" className="space-y-2 text-foreground">
                  {recovery.status === 'searching' && <p>같은 이름으로 방금 만든 게시판이 있는지 게시판 목록에서 확인하는 중…</p>}
                  {recovery.status === 'found' && (
                    <>
                      <p>
                        같은 이름으로 방금 만든 게시판이 있습니다 — {recovery.board.bbsTtl}(ID {recovery.board.bbsId}, 만든 시각 {displayCreatedAt(recovery.board.crtDt)}).
                        이 게시판이 방금 만든 것이면 이어서 진행하세요. 다시 만들면 같은 이름의 게시판이 하나 더 생깁니다.
                      </p>
                      <Button type="button" size="sm" onClick={() => continueWithFound(recovery.board)}>
                        이 게시판으로 계속하기
                      </Button>
                    </>
                  )}
                  {recovery.status === 'none' && (
                    <p>같은 이름으로 방금 만든 게시판을 찾지 못했습니다. 게시판 목록에서 생성 여부를 확인한 뒤 다시 시도해 주세요.</p>
                  )}
                  {recovery.status === 'failed' && (
                    <p>게시판 목록을 불러오지 못해 생성 여부를 확인하지 못했습니다. 게시판 목록에서 생성 여부를 확인한 뒤 다시 시도해 주세요.</p>
                  )}
                  {recovery.status === 'unavailable' && (
                    <p>게시판 목록을 볼 권한이 없어 생성 여부를 확인할 수 없습니다. 게시판 관리 조회 권한이 있는 관리자에게 생성 여부를 확인한 뒤 다시 시도해 주세요.</p>
                  )}
                </div>
              )}
            </div>
          ) : null}
          <CardHeader className="relative border-b border-border bg-muted p-4 text-foreground">
            <div className="relative z-10 space-y-1 text-left">
              <h2 className="text-lg font-bold text-left">
                {STEPS[currentStep - 1].title}
              </h2>
              <p className="text-[length:var(--font-size-body)] text-muted-foreground text-left">
                {STEPS[currentStep - 1].description}
              </p>
            </div>
          </CardHeader>

          <CardContent className="min-h-[20rem] p-4 text-left">
            <div key={currentStep}>
              {currentStep === 1 && (
                <div className="max-w-2xl space-y-4 text-left">
                  <fieldset className="space-y-2">
                    <legend className="text-[length:var(--font-size-body)] font-medium text-foreground">용도</legend>
                    <p id="purpose-help" className="text-xs text-muted-foreground">
                      용도를 고르면 화면 유형과 기능 칸(댓글·만족도·추천·첨부·예약 게시·상단 고정·비밀글) 가운데 아직 직접 바꾸지 않은 칸만 채웁니다.
                      다음 단계에서 바꿀 수 있습니다.
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-describedby="purpose-help">
                      {[
                        { id: '', label: '고르지 않음', description: '지금 칸의 값을 그대로 둡니다.' },
                        ...BOARD_PURPOSES.map((preset) => ({ id: preset.id, label: preset.label, description: describePurpose(preset) })),
                      ].map((option) => (
                        <label
                          key={option.id || 'none'}
                          className={cn(
                            "flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-[length:var(--font-size-body)]",
                            purpose === option.id ? "border-primary bg-primary/5" : "border-border",
                          )}
                        >
                          <input
                            type="radio"
                            name="board-purpose"
                            value={option.id}
                            checked={purpose === option.id}
                            onChange={() => applyPurpose(option.id)}
                            aria-label={option.label}
                            aria-describedby={`purpose-${option.id || 'none'}-help`}
                            className="mt-1 accent-primary"
                          />
                          <span>
                            <span className="font-medium text-foreground">{option.label}</span>
                            <span id={`purpose-${option.id || 'none'}-help`} className="block text-xs text-muted-foreground">{option.description}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                    <p id="purpose-notice" role="status" className="min-h-4 text-xs text-foreground">{purposeNotice}</p>
                  </fieldset>

                  <div className="space-y-1 text-left">
                    <Label htmlFor="bbsTtl" className="text-[length:var(--font-size-body)] font-medium text-foreground">
                      게시판 명칭
                    </Label>
                    <Input
                      id="bbsTtl"
                      autoFocus
                      maxLength={100}
                      aria-required="true"
                      aria-invalid={errors.bbsTtl ? 'true' : 'false'}
                      aria-describedby={errors.bbsTtl ? 'bbsTtl-error' : undefined}
                      placeholder="예) 사내 소식 공유 게시판"
                      className={cn(
                        "bg-card text-[length:var(--font-size-body)]",
                        errors.bbsTtl ? "border-destructive bg-destructive/10" : "border-border"
                      )}
                      {...register('bbsTtl')}
                    />
                    {errors.bbsTtl && <p id="bbsTtl-error" className="text-destructive-emphasis text-sm font-bold ml-2">{errors.bbsTtl.message}</p>}
                    {bbsTtl?.includes('공지') && (
                      <p className="text-xs text-muted-foreground">
                        이름에 &lsquo;공지&rsquo;가 들어가도 공지 게시판 편집 권한이 적용되지 않습니다. 공지 게시판은 시스템 설정이 정합니다.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1 text-left">
                    <Label htmlFor="bbsExpln" className="text-[length:var(--font-size-body)] font-medium text-foreground">
                      게시판 소개
                    </Label>
                    <Textarea
                      id="bbsExpln"
                      maxLength={4000}
                      aria-invalid={errors.bbsExpln ? 'true' : 'false'}
                      aria-describedby={errors.bbsExpln ? 'bbsExpln-error' : undefined}
                      placeholder="게시판의 목적과 사용 대상을 간단히 설명해주세요."
                      className="min-h-[5rem] border-border bg-card text-[length:var(--font-size-body)] text-left"
                      {...register('bbsExpln')}
                    />
                    {errors.bbsExpln && <p id="bbsExpln-error" className="text-destructive-emphasis text-sm font-bold ml-2">{errors.bbsExpln.message}</p>}
                  </div>

                  {/* reusable-base:community:start */}
                  <div className="space-y-1 text-left">
                    <Label htmlFor="cmntySn" className="text-[length:var(--font-size-body)] font-medium text-foreground">
                      커뮤니티 귀속
                    </Label>
                    <select
                      id="cmntySn"
                      aria-describedby="cmntySn-help"
                      className="h-[var(--control-h)] w-full rounded-md border border-border bg-card px-3 text-[length:var(--font-size-body)] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      {...register('cmntySn')}
                    >
                      <option value="">귀속하지 않음 (모든 인증 사용자 열람)</option>
                      {communityOptions.map((community) => (
                        <option key={community.cmntySn} value={String(community.cmntySn)}>
                          {community.cmntyNm}
                        </option>
                      ))}
                    </select>
                    <p id="cmntySn-help" className="text-[length:var(--font-size-body)] text-muted-foreground">
                      커뮤니티에 귀속하면 <strong>승인된 회원과 관리자만</strong> 이 게시판의 글을 보고 쓸 수 있고,
                      통합 검색 결과에서도 제외됩니다. 귀속은 생성 후에는 바꿀 수 없습니다.
                    </p>
                  </div>
                  {/* reusable-base:community:end */}
                </div>
              )}

              {currentStep === 2 && (
                <div className="flex flex-col gap-6 text-left lg:flex-row">
                  <div className="flex-1 space-y-4 text-left">
                    <div className="space-y-1 text-left">
                      <h3 className="text-[length:var(--font-size-body)] font-semibold text-foreground text-left">화면 유형</h3>
                      <p className="text-[length:var(--font-size-body)] text-muted-foreground text-left">게시판 글을 어떤 모양으로 보일지 고르세요. 만든 뒤에는 바꿀 수 없습니다.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {TEMPLATES.map((tpl) => {
                        const Icon = tpl.icon;
                        const isSelected = selectedTemplate === tpl.id;

                        return (
                          <div
                            key={tpl.id}
                            role="button"
                            tabIndex={0}
                            aria-pressed={isSelected}
                            onClick={() => { touch('tmpltId'); setTemplate(tpl.id); }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                touch('tmpltId');
                                setTemplate(tpl.id);
                              }
                            }}
                            className={cn(
                              "group relative p-8 rounded-md border cursor-pointer flex items-center gap-3 transition-colors",
                              isSelected ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:border-primary"
                            )}
                          >
                            <div className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-md",
                              tpl.color
                            )}>
                              <Icon size={18} aria-hidden="true" />
                            </div>

                            <div className="flex-1 space-y-0.5 text-left">
                              <h4 className="text-[length:var(--font-size-body)] font-semibold text-foreground text-left">
                                {tpl.name}
                              </h4>
                              <p className="text-xs text-muted-foreground leading-snug text-left">
                                {tpl.description}
                              </p>
                            </div>

                            <div className={cn(
                              "flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors",
                              isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border text-transparent"
                            )}>
                              <Check size={14} strokeWidth={3} aria-hidden="true" />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/*
                      [2026-09-27 DIP B5 F9] 서버가 새 댓글·새 평가·첨부를 이 값으로 거부하고 게시글 화면이 같은 값으로 입력을 감춘다.
                      [2026-10-23 §5.3] 파일 수·파일당 크기도 여기서 정한다(만든 뒤에는 운영 화면 설정 탭에서 바꾼다).
                    */}
                    <fieldset className="space-y-2 rounded-md border border-border p-3">
                      <legend className="px-1 text-[length:var(--font-size-body)] font-medium text-foreground">게시판 기능</legend>
                      {([
                        ['ansYn', '댓글 받기', '끄면 새 댓글을 받지 않습니다. 이미 달린 댓글은 그대로 보입니다.'],
                        ['stsfdgYn', '만족도 평가 받기', '끄면 새 만족도 평가를 받지 않습니다.'],
                        ['fileAtchPsbltyYn', '파일 첨부 허용', '끄면 새 첨부를 받지 않습니다.'],
                        // [2026-10-23 ADR-0040 결정 3·6] 기본은 받지 않음이다(체크 해제가 'N').
                        ['rsvtPstgPsbltyYn', '예약 게시 받기', '켜면 오늘보다 뒤의 시작일을 받습니다. 그 글은 시작일까지 작성자와 게시판 관리자에게만 보입니다.'],
                        // [2026-10-23 ADR-0040 결정 5·6] 기본은 허용 안 함이다. 고정하려면 게시글 상단 고정 권한(BOARD_PIN)도 있어야 한다.
                        ['upendFixPsbltyYn', '상단 고정 받기', '켜면 운영 화면에서 글을 게시판 목록 맨 위에 고정할 수 있습니다(게시글 상단 고정 권한 필요).'],
                        // [2026-10-23 ADR-0040 결정 6] 기본은 받음이다. 끄면 새 추천만 막고, 각자 자기 추천은 거둘 수 있다.
                        ['rcmdtnUseYn', '추천 받기', '끄면 새 추천을 받지 않습니다. 쌓인 추천 수는 그대로이고 각자 자기 추천은 거둘 수 있습니다.'],
                      ] as const).map(([field, label, help]) => (
                        <label key={field} className="flex items-start gap-2 text-[length:var(--font-size-body)] text-foreground">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 accent-primary"
                            aria-label={label}
                            checked={watch(field) !== 'N'}
                            onChange={(event) => { touch(field); setValue(field, event.target.checked ? 'Y' : 'N', { shouldDirty: true }); }}
                            aria-describedby={`${field}-help`}
                          />
                          <span>
                            <span className="font-medium">{label}</span>
                            <span id={`${field}-help`} className="block text-xs text-muted-foreground">{help}</span>
                          </span>
                        </label>
                      ))}
                      <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label htmlFor="atchPsbltyFileQty" className="text-xs font-medium text-foreground">첨부 파일 수(0 은 상한 없음)</Label>
                          <Input
                            id="atchPsbltyFileQty"
                            type="number"
                            min={0}
                            max={SERVER_MAX_FILES_PER_REQUEST}
                            aria-invalid={errors.atchPsbltyFileQty ? 'true' : 'false'}
                            aria-describedby={errors.atchPsbltyFileQty ? 'atchPsbltyFileQty-error' : undefined}
                            value={Number.isNaN(Number(watch('atchPsbltyFileQty'))) ? '' : String(watch('atchPsbltyFileQty'))}
                            onChange={(event) => {
                              touch('atchPsbltyFileQty');
                              setValue('atchPsbltyFileQty', event.target.value === '' ? Number.NaN : Number(event.target.value), { shouldDirty: true });
                            }}
                          />
                          {errors.atchPsbltyFileQty && <p id="atchPsbltyFileQty-error" className="text-destructive-emphasis text-xs font-bold">{errors.atchPsbltyFileQty.message}</p>}
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="atchPsbltyFileSz" className="text-xs font-medium text-foreground">파일당 크기(MB, 비우면 전역 상한 {SERVER_MAX_FILE_SIZE_MB}MB)</Label>
                          <Input
                            id="atchPsbltyFileSz"
                            type="number"
                            min={0}
                            max={SERVER_MAX_FILE_SIZE_MB}
                            step="0.5"
                            aria-invalid={errors.atchPsbltyFileSz ? 'true' : 'false'}
                            aria-describedby={errors.atchPsbltyFileSz ? 'atchPsbltyFileSz-error' : undefined}
                            value={fileSizeBytes > 0 ? String(fileSizeBytes / BYTES_PER_MB) : ''}
                            onChange={(event) => setValue('atchPsbltyFileSz', event.target.value === '' ? 0 : Math.round(Number(event.target.value) * BYTES_PER_MB), { shouldDirty: true })}
                          />
                          {errors.atchPsbltyFileSz && <p id="atchPsbltyFileSz-error" className="text-destructive-emphasis text-xs font-bold">{errors.atchPsbltyFileSz.message}</p>}
                        </div>
                      </div>
                      {/* 상단 고정 상한·기본 일수 — 고정을 받지 않는 동안은 읽기 전용이다(값은 그대로 저장돼 나중에 켜면 쓴다). */}
                      <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                        {([
                          ['upendFixUplmtNocs', '상단 고정 상한(건)', PIN_LIMIT_RANGE],
                          ['upendFixBscDayCnt', '상단 고정 기본 일수(일)', PIN_DAYS_RANGE],
                        ] as const).map(([field, label, range]) => (
                          <div key={field} className="space-y-1">
                            <Label htmlFor={field} className="text-xs font-medium text-foreground">{label}</Label>
                            <Input
                              id={field}
                              type="number"
                              min={range.min ?? undefined}
                              max={range.max ?? undefined}
                              readOnly={watch('upendFixPsbltyYn') !== 'Y'}
                              aria-invalid={errors[field] ? 'true' : 'false'}
                              aria-describedby={errors[field] ? `${field}-error` : undefined}
                              value={Number.isNaN(Number(watch(field))) ? '' : String(watch(field) ?? '')}
                              onChange={(event) => {
                                touch(field);
                                setValue(field, event.target.value === '' ? Number.NaN : Number(event.target.value), { shouldDirty: true });
                              }}
                            />
                            {errors[field] && <p id={`${field}-error`} className="text-destructive-emphasis text-xs font-bold">{errors[field]?.message}</p>}
                          </div>
                        ))}
                      </div>
                      {/*
                        [2026-10-23 ADR-0040 결정 7] 비밀글 정책. 없음은 작성 화면에 선택이 없고(지금 동작), 선택은 글쓴이가 고르며, 필수는
                        서버가 늘 비밀글로 저장한다. 질의응답형 용도가 선택을 채운다. 만든 뒤에는 운영 화면 설정 탭에서 바꾼다.
                      */}
                      <div className="space-y-1 pt-1">
                        <Label htmlFor="prvtPstPlcyCd" className="text-xs font-medium text-foreground">비밀글 정책</Label>
                        <select
                          id="prvtPstPlcyCd"
                          value={watch('prvtPstPlcyCd') ?? 'NONE'}
                          aria-describedby="prvtPstPlcyCd-help"
                          onChange={(event) => {
                            touch('prvtPstPlcyCd');
                            setValue('prvtPstPlcyCd', event.target.value as PrivatePostPolicy, { shouldDirty: true });
                          }}
                          className="h-[var(--control-h)] w-full rounded-md border border-border bg-card px-3 text-[length:var(--font-size-body)] sm:w-60"
                        >
                          {(Object.keys(PRIVATE_POST_POLICY_OPTIONS) as PrivatePostPolicy[]).map((policy) => (
                            <option key={policy} value={policy}>{PRIVATE_POST_POLICY_OPTIONS[policy]}</option>
                          ))}
                        </select>
                        <p id="prvtPstPlcyCd-help" className="text-xs text-muted-foreground">
                          비밀글은 작성자와 게시판 관리자만 봅니다. 필수면 저장하는 글이 모두 비밀글이 됩니다.
                        </p>
                      </div>
                    </fieldset>
                  </div>

                  {/* 미리보기는 좁은 폭에서도 보인다(§5.3) — 넓은 화면에서는 옆에, 좁은 화면에서는 아래에 둔다. */}
                  <div className="flex-1 lg:sticky lg:top-0">
                    <div className="mb-2">
                      <h3 className="text-xs font-medium text-muted-foreground lg:text-right">레이아웃 미리보기 · 예시 데이터</h3>
                    </div>
                    <BoardPreview
                      tmpltId={selectedTemplate || DEFAULT_BOARD_TYPE.templateId}
                      bbsTtl={bbsTtl}
                      bbsExpln={bbsExpln || ''}
                      features={previewFeatures}
                    />
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="max-w-2xl space-y-4 text-left">
                  {/* [2026-10-26 ADR-0043 WIZ 6] 만들 설정을 빠짐없이 보인다 — 화면 유형·귀속은 만든 뒤 바꿀 수 없다. */}
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-md border border-border p-4 text-[length:var(--font-size-body)] sm:grid-cols-[10rem_1fr]">
                    <dt className="text-muted-foreground">게시판 이름</dt>
                    <dd className="break-all text-foreground">{bbsTtl}</dd>
                    <dt className="text-muted-foreground">게시판 소개</dt>
                    <dd className="break-all text-foreground">{bbsExpln?.trim() ? bbsExpln : '입력하지 않음'}</dd>
                    <dt className="text-muted-foreground">용도</dt>
                    <dd className="text-foreground">{BOARD_PURPOSES.find((option) => option.id === purpose)?.label ?? '고르지 않음'}</dd>
                    <dt className="text-muted-foreground">화면 유형</dt>
                    <dd className="text-foreground">{templateName(selectedTemplate)} <span className="text-muted-foreground">(만든 뒤 바꿀 수 없음)</span></dd>
                    <dt className="text-muted-foreground">댓글</dt>
                    <dd className="text-foreground">{yesNo(watch('ansYn'))}</dd>
                    <dt className="text-muted-foreground">만족도 평가</dt>
                    <dd className="text-foreground">{yesNo(watch('stsfdgYn'))}</dd>
                    <dt className="text-muted-foreground">추천</dt>
                    <dd className="text-foreground">{yesNo(watch('rcmdtnUseYn'))}</dd>
                    <dt className="text-muted-foreground">파일 첨부</dt>
                    <dd className="text-foreground">{attachmentSummary}</dd>
                    <dt className="text-muted-foreground">예약 게시</dt>
                    <dd className="text-foreground">{watch('rsvtPstgPsbltyYn') === 'Y' ? '받음' : '받지 않음'}</dd>
                    <dt className="text-muted-foreground">상단 고정</dt>
                    <dd className="text-foreground">
                      {watch('upendFixPsbltyYn') === 'Y'
                        ? `허용(상한 ${watch('upendFixUplmtNocs')}건 · 기본 ${watch('upendFixBscDayCnt')}일)`
                        : '허용 안 함'}
                    </dd>
                    <dt className="text-muted-foreground">비밀글 정책</dt>
                    <dd className="text-foreground">{PRIVATE_POST_POLICY_SUMMARY[watch('prvtPstPlcyCd') ?? 'NONE']}</dd>
                    {/* reusable-base:community:start */}
                    <dt className="text-muted-foreground">커뮤니티 귀속</dt>
                    <dd className="text-foreground">
                      {communityOptions.find((community) => String(community.cmntySn) === watch('cmntySn'))?.cmntyNm ?? '귀속하지 않음'}
                      {' '}<span className="text-muted-foreground">(만든 뒤 바꿀 수 없음)</span>
                    </dd>
                    {/* reusable-base:community:end */}
                    <dt className="text-muted-foreground">만든 직후 상태</dt>
                    <dd className="text-foreground">사용 안 함</dd>
                    <dt className="text-muted-foreground">메뉴</dt>
                    <dd className="text-foreground">만들지 않음</dd>
                  </dl>

                  <div className="flex items-start gap-3 rounded-md border border-warning/40 bg-warning/15 p-4 text-left">
                    <Info className="size-4 shrink-0 text-foreground" aria-hidden="true" />
                    <div className="space-y-1 text-left">
                      <p className="font-semibold text-foreground text-[length:var(--font-size-body)] text-left">만든 직후의 상태</p>
                      <ul className="list-disc space-y-1 pl-5 text-[length:var(--font-size-body)] text-muted-foreground">
                        <li>게시판: 사용 안 함으로 만들어져 이용자에게 닫혀 있습니다. 글을 준비한 뒤 결과 화면이나 운영 화면 설정 탭에서 사용으로 바꿉니다.</li>
                        <li>메뉴: 만들지 않습니다. 필요하면 만든 뒤 결과 화면이나 운영 화면 메뉴·접근 탭에서 메뉴에 붙입니다.</li>
                        <li>권한: 새로 주지 않습니다. 게시글 권한은 모든 게시판에 함께 적용됩니다.</li>
                      </ul>
                    </div>
                  </div>

                  {/*
                   * 종전 3단계에는 역할×권한 체크박스 매트릭스가 있었으나, 게시판별 권한은 저장할 테이블도
                   * API 도 존재하지 않아 선택값이 서버로 전송되지 않고 브라우저에서 사라졌다.
                   * 운영자는 '익명 쓰기 금지'를 설정했다고 믿지만 실제로는 아무 정책도 적용되지 않는
                   * 보안 오인 상태였다. 실제 통제 지점을 안내하도록 대체한다.
                   *
                   * [2026-10-23 ADR-0040 A0] 종전 안내("접근 권한은 메뉴 권한을 따른다")도 사실이 아니었다. 메뉴는 길 안내일 뿐
                   * 게시판 이용 화면은 인증만 요구한다. 접근을 정하는 축(메뉴 노출·게시글 권한·회원 범위)을 그대로 말한다. 회원 범위는
                   * 커뮤니티 기능의 축이라 커뮤니티 마커 안에 둔다 — 커뮤니티 없이 만든 생성물에는 귀속 입력도 그 축도 없다.
                   * [2026-10-26 ADR-0043] 메뉴 단계를 걷으면서 이 안내를 최종 확인으로 옮겼다.
                   */}
                  <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4 text-left">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 rounded-md border border-border bg-card p-2 text-primary">
                        <ShieldCheck size={24} aria-hidden="true" />
                      </div>
                      <div className="space-y-2 text-left">
                        <p className="font-semibold text-foreground text-[length:var(--font-size-body)] text-left">이 게시판을 누가 쓸 수 있는지는 아래 규칙으로 정해집니다</p>
                        <p className="text-[length:var(--font-size-body)] text-muted-foreground text-left">
                          게시판 단위로 이용자를 나누는 권한 설정은 제공하지 않습니다.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-md border border-border bg-card p-3 space-y-2 text-left">
                      <p className="text-xs font-semibold text-muted-foreground">현재 적용되는 규칙</p>
                      <ul className="space-y-1 text-[length:var(--font-size-body)] text-foreground list-disc pl-5">
                        <li>메뉴 노출: 메뉴는 길 안내일 뿐 접근을 막지 않습니다. 메뉴가 보이지 않아도 주소를 아는 로그인 사용자는 사용 중인 게시판을 엽니다.</li>
                        <li>게시글 권한: 글 보기·쓰기·고치기·지우기 권한은 모든 게시판에 함께 적용되고, 기본으로 일반 사용자 그룹에 있습니다.</li>
                        {/* reusable-base:community:start */}
                        <li>회원 범위: 게시판마다 이용자를 나누는 수단은 커뮤니티 귀속 하나입니다. 귀속 게시판은 그 커뮤니티의 승인 회원만 씁니다.</li>
                        {/* reusable-base:community:end */}
                        <li>로그인하지 않은 사용자는 게시판을 열 수 없습니다.</li>
                      </ul>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      만들려면 게시판 만들기 권한(BBS_MST_CREATE)이 필요합니다. 메뉴 권한은 필요하지 않습니다.
                    </p>

                    {canOpenAuthority && (
                      <Link
                        href="/admin/security/authority"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
                      >
                        권한 정책 관리에서 그룹별 게시글 권한 확인하기
                        <ArrowUpRight size={16} aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/50 p-4 text-left">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={prevStep}
                disabled={currentStep === 1 || isSubmitting}
                className="flex items-center gap-2 font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground disabled:invisible"
              >
                <ChevronLeft className="size-4" aria-hidden="true" /> 이전 단계
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="lg"
                onClick={cancelWizard}
                disabled={isSubmitting}
                className="font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
              >
                만들기 취소
              </Button>
            </div>

            {/* 권한이 없으면 첫 단계부터 사유를 보인다 — 단계를 다 채운 뒤에 알리지 않는다. */}
            {missingPermissionReason ? (
              <p role="status" className="text-[length:var(--font-size-body)] font-medium text-muted-foreground">
                {missingPermissionReason}
              </p>
            ) : (
              <Button
                type={currentStep === STEPS.length ? 'submit' : 'button'}
                onClick={currentStep === STEPS.length ? undefined : (event) => {
                  event.preventDefault();
                  void handleNextStep();
                }}
                size="lg"
                disabled={isSubmitting}
                className={cn(
                  "w-full font-semibold transition-colors sm:w-auto",
                  currentStep === STEPS.length
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-inverse text-surface-inverse-foreground dark:bg-primary dark:text-primary-foreground hover:bg-surface-inverse/90 dark:hover:bg-primary/90"
                )}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    {/* 결과를 모를 때는 다시 보내지 않고 방금 만든 게시판을 찾는 중이다 — 그동안 잠긴 단추가 그 일을 말한다. */}
                    <span className="text-left font-semibold">{recovery?.status === 'searching' ? '생성 여부 확인 중…' : '게시판 만드는 중…'}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-3">
                    {currentStep === STEPS.length ? '게시판 만들기' : '다음 단계로'}
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </span>
                )}
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
