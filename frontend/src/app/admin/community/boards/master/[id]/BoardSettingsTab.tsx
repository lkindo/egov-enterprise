'use client';

import { useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { History, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FormErrorSummary } from '@/components/ui/form';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { knowledgeTabsForBoard } from '@/app/admin/help/knowledge-tab-boards';
import { useAuth } from '@/contexts/AuthContext';
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext';
import { canPermission } from '@/lib/auth/permissions';
import { canOpenPage } from '@/lib/auth/page-access';
import { isConflictError } from '@/lib/query/list-query-defaults';
import { summarizeError } from '@/lib/safe-error-log';
import { handOffMenuFocus } from '@/lib/navigation/target-handoff';
import { BOARD_TYPE_PAIR_MISMATCH, boardTypeDisplay } from '@/lib/board/board-types';
import {
  findBoardMenuLinks,
  type BoardMenuLink,
  type BoardMenuLinks,
  type MenuExposure,
} from '@/lib/board/board-menu-links';
import { SERVER_MAX_FILE_SIZE_MB, SERVER_MAX_FILES_PER_REQUEST } from '@/lib/attachments/server-upload-limits';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { boardMasterQueryOptions, invalidateBoardCaches } from '@/queries/board-master-query-options';
import {
  boardAdminService,
  type BoardMasterDetail,
  type BoardMasterUpdateRequest,
} from '@/services/foundation/system/BoardAdminService';
import { BoardMasterUpdateRequestSchema } from '@/types/generated-zod';
import { BoardChangeHistoryDialog } from './BoardChangeHistoryDialog';
import {
  BOARD_SETTING_TEXT,
  BYTES_PER_MB,
  PRIVATE_POST_POLICY_OPTIONS,
  type PrivatePostPolicy,
  type SettingValueText,
} from './board-setting-values';
import { boardOperationsHref } from '../board-operations-tabs';
import { boardUsageNotes, isHelpQnaBoard, privatePostPolicyWarnings } from '../board-usage';
import { generatedRange, pinCountSchema } from '../board-pin-count';
import { useBoardAccessSources } from '../useBoardAccessSources';

/**
 * 게시판 운영 화면의 설정 탭(ADR-0040 §5.5·결정 9·10).
 *
 * A3-1 판정: 같은 화면 탭 패널 안에서 펼쳐지는 **인라인** 그릇이다(라우트 이동 0 — 카탈로그 우선순위의 첫째). 저장 전 확인은 화면
 * 안 대화상자로 한다. 확인 대화상자가 있어 폼 그릇 census 후보에서 빠지는 것은 이 판정의 근거가 아니다.
 *
 * 저장은 "변경 n건 · 변경 취소 · 변경 내용 확인" 순이다. 확인 표에 항목·현재·변경 후·영향을 보이고, 서버가 버전 충돌(409)로
 * 거부하면 최신 값을 다시 읽어 같은 표로 비교하게 한다. 화면 유형·커뮤니티 귀속은 만든 뒤 바꾸지 않으므로 읽기 전용이다.
 *
 * [2026-10-26 ADR-0043 1차] 영향 안내를 보강한다. 사용 안 함·이름 바꾸기·영구 삭제 확인에 이 게시판을 가리키는 메뉴(메뉴·접근 탭과
 * 같은 판정 — board-menu-links)를 보이고, 메뉴는 메뉴 관리로 넘겨 고친다(menu-focus 인계, 돌아올 곳은 이 탭). 메뉴를 자동으로 끄거나
 * 고치지 않는다 — 메뉴 저장은 메뉴 관리가 권한을 집행한다(ADR-0040 결정 8). 지정 게시판은 영구 삭제 단추를 끄고 서버 거부(B007)와
 * 같은 사유를 보인다(ADR-0043 결정 4).
 */
type FieldKey = 'bbsTtl' | 'bbsExpln' | 'useYn' | 'ansYn' | 'stsfdgYn' | 'fileAtchPsbltyYn' | 'atchPsbltyFileQty' | 'atchPsbltyFileSz'
  | 'rsvtPstgPsbltyYn' | 'upendFixPsbltyYn' | 'upendFixUplmtNocs' | 'upendFixBscDayCnt' | 'prvtPstPlcyCd' | 'rcmdtnUseYn';
type Draft = Partial<Record<FieldKey, string | number>>;

/** 지금 유효한 상단 고정 수(서버 값). 상한을 낮출 때만 읽는다. */
type ActivePins =
  | { state: 'ready'; count: number }
  | { state: 'loading' }
  | { state: 'failed' }
  | { state: 'no-permission' };

/** 영향 문장이 쓰는 이 게시판의 사정. */
interface ImpactContext {
  /** 커뮤니티 귀속 게시판인가 — 입구가 커뮤니티 화면이고 통합 검색에 나오지 않는다. */
  communityBound: boolean;
  /** 이름을 바꿔도 화면이 정해 그대로인 곳(업무 홈 카드 제목·지식 허브 탭 이름). */
  fixedNames: readonly string[];
  activePins: ActivePins;
}

const PRIVATE_POST_POLICIES = BoardMasterUpdateRequestSchema.shape.prvtPstPlcyCd.unwrap().options;
const toPrivatePostPolicy = (value: unknown): PrivatePostPolicy =>
  (PRIVATE_POST_POLICIES as readonly unknown[]).includes(value) ? value as PrivatePostPolicy : 'NONE';
/** 확인 표의 값 표기 — 변경 이력과 같은 표기(board-setting-values)다. 어휘 밖의 값은 '—' 로 보인다. */
const shown = (text: SettingValueText) => (value: unknown) => text(value) ?? '—';
/** 설정 값을 줄였는가 — 0 이하는 '상한 없음·전역 상한' 이므로 0 에서 양수로 바꾸는 것도 줄이는 것이다. */
const narrowed = (next: unknown, current: unknown) => {
  const after = Number(next);
  const before = Number(current);
  return after > 0 && (!(before > 0) || after < before);
};

const FIELDS: readonly {
  key: FieldKey;
  label: string;
  format: (value: unknown) => string;
  impact?: (next: unknown, current: unknown, context: ImpactContext) => string | null;
}[] = [
  // [2026-10-26 ADR-0043 SET-06] 이름은 메뉴·업무 홈 카드·허브 탭으로 번지지 않는다 — 메뉴 이름은 메뉴 관리에서 따로 바꾼다.
  {
    key: 'bbsTtl', label: '게시판 명칭', format: shown(BOARD_SETTING_TEXT.bbsTtl),
    impact: (_next, _current, { fixedNames }) => [
      '게시판 관리 목록과 이용 화면에 새 이름이 보입니다. 연결된 메뉴 이름은 바뀌지 않습니다 — 메뉴 관리에서 따로 바꿉니다.',
      fixedNames.length > 0 ? `${fixedNames.join('과 ')}도 화면이 정해 그대로입니다.` : null,
    ].filter(Boolean).join(' '),
  },
  { key: 'bbsExpln', label: '게시판 소개', format: shown(BOARD_SETTING_TEXT.bbsExpln) },
  // [2026-10-26 ADR-0043 SET-03] 메뉴는 길 안내일 뿐 접근을 막지 않는다(ADR-0040 §3.1) — 사용으로 바꾸면 메뉴 상태와 상관없이 열린다.
  {
    key: 'useYn', label: '게시판 사용', format: shown(BOARD_SETTING_TEXT.useYn),
    impact: (value, _current, { communityBound }) => {
      if (value === 'N') return '이용자에게 읽기·쓰기 모두 닫힙니다. 운영자는 글을 정리할 수 있습니다.';
      return communityBound
        ? '귀속 커뮤니티의 승인 회원과 관리자에게 열립니다. 입구는 커뮤니티 화면이고, 통합 검색에는 나오지 않습니다.'
        : '이용자에게 열립니다. 메뉴가 비활성이거나 관리자 전용이어도 게시글 권한이 있는 로그인 사용자는 주소·통합 검색·게시판 선택지로 이 게시판을 엽니다.';
    },
  },
  { key: 'ansYn', label: '댓글 받기', format: shown(BOARD_SETTING_TEXT.ansYn), impact: (value) => (value === 'N' ? '새 댓글만 막습니다. 이미 달린 댓글은 그대로 보입니다.' : null) },
  { key: 'stsfdgYn', label: '만족도 평가 받기', format: shown(BOARD_SETTING_TEXT.stsfdgYn), impact: (value) => (value === 'N' ? '새 평가만 막습니다. 이미 남긴 평가는 그대로 보입니다.' : null) },
  // [2026-10-26 ADR-0043 SET-04] 첨부를 끄면 작성 화면이 본문 이미지·영상 삽입도 막는다(본문 미디어도 첨부로 저장된다).
  {
    key: 'fileAtchPsbltyYn', label: '파일 첨부 허용', format: shown(BOARD_SETTING_TEXT.fileAtchPsbltyYn),
    impact: (value) => (value === 'N' ? '새 첨부만 막습니다. 이미 붙은 파일은 그대로입니다. 본문 이미지·영상도 새로 넣을 수 없습니다.' : null),
  },
  // [SET-04] 파일 수는 이미 붙은 파일(본문 미디어 포함)과 합쳐 판정한다(BoardPolicySupport#assertAttachmentPolicy). 파일당 크기는 새로
  //   올리는 파일만 본다 — 줄여도 이미 붙은 큰 파일 때문에 막히지는 않는다.
  {
    key: 'atchPsbltyFileQty', label: '첨부 파일 수', format: shown(BOARD_SETTING_TEXT.atchPsbltyFileQty),
    impact: (next, current) => (narrowed(next, current)
      ? '새로 붙이는 파일부터 이 상한을 적용합니다. 이미 상한을 넘은 글은 그대로 두지만, 그 글에 파일(본문 이미지·영상 포함)을 더하려면 먼저 상한 안으로 줄여야 합니다.'
      : null),
  },
  {
    key: 'atchPsbltyFileSz', label: '파일당 크기', format: shown(BOARD_SETTING_TEXT.atchPsbltyFileSz),
    impact: (next, current) => (narrowed(next, current)
      ? '새로 올리는 파일부터 이 크기를 적용합니다. 이미 붙은 파일은 이 크기보다 커도 그대로 둡니다.'
      : null),
  },
  // [2026-10-23 ADR-0040 결정 3·6] 예약 게시는 새 미래 시작일만 막는다 — 이미 있는 글의 가시성은 바뀌지 않는다.
  //   이름은 서버 변경 이력의 항목명('예약 게시')과 같다.
  {
    key: 'rsvtPstgPsbltyYn', label: '예약 게시', format: shown(BOARD_SETTING_TEXT.rsvtPstgPsbltyYn),
    impact: (value) => (value === 'N'
      ? '새 미래 시작일만 막습니다. 이미 예약된 글은 시작일에 공개됩니다.'
      : '새 글에 오늘보다 뒤의 시작일을 받습니다. 그 글은 시작일까지 작성자와 게시판 관리자에게만 보입니다.'),
  },
  // [2026-10-23 ADR-0040 결정 5·6] 상단 고정 설정은 새 고정만 정한다 — 끄거나 상한을 낮춰도 이미 고정된 글은 종료일까지 그대로다.
  //   이름은 서버 변경 이력의 항목명('상단 고정 허용'·'상단 고정 상한'·'상단 고정 기본 일수')과 같다.
  {
    key: 'upendFixPsbltyYn', label: '상단 고정 허용', format: shown(BOARD_SETTING_TEXT.upendFixPsbltyYn),
    impact: (value) => (value === 'N'
      ? '새 고정만 막습니다. 고정 중인 글은 고정 종료일까지 위에 남고 해제할 수 있습니다.'
      : '운영 화면 게시물 탭에서 글을 상단에 고정할 수 있습니다(게시글 상단 고정 권한 필요).'),
  },
  // [2026-10-26 ADR-0043 SET-10] 상한을 낮출 때는 지금 유효한 고정 수(서버가 센 값)를 함께 보인다 — 화면이 세지 않는다(결정 5).
  {
    key: 'upendFixUplmtNocs', label: '상단 고정 상한', format: shown(BOARD_SETTING_TEXT.upendFixUplmtNocs),
    impact: (next, current, { activePins }) => {
      const base = '새 고정이 이 상한을 따릅니다. 줄여도 이미 고정된 글은 풀리지 않습니다.';
      const limit = Number(next);
      if (!(limit < Number(current))) return base;
      switch (activePins.state) {
        case 'ready': {
          const count = activePins.count.toLocaleString('ko-KR');
          return activePins.count >= limit
            ? `${base} 지금 유효한 고정 ${count}건 — 고정이 ${limit.toLocaleString('ko-KR')}건보다 적어질 때까지 새 고정을 받지 않습니다.`
            : `${base} 지금 유효한 고정 ${count}건.`;
        }
        case 'loading': return `${base} 지금 유효한 고정 수를 확인하는 중…`;
        case 'failed': return `${base} 지금 유효한 고정 수를 불러오지 못했습니다.`;
        case 'no-permission': return `${base} 지금 유효한 고정 수는 게시글 조회 대행 권한(BOARD_READ_ALL)이 있어야 보입니다.`;
      }
    },
  },
  {
    key: 'upendFixBscDayCnt', label: '상단 고정 기본 일수', format: shown(BOARD_SETTING_TEXT.upendFixBscDayCnt),
    impact: () => '고정 종료일을 비우고 고정할 때의 기간입니다. 이미 고정된 글의 종료일은 바뀌지 않습니다.',
  },
  // [2026-10-23 ADR-0040 결정 6·7] 비밀글 정책은 앞으로 저장하는 글에만, 추천 받기는 새 추천에만 적용된다 — 이미 있는 비밀글은 계속
  //   보호되고 쌓인 추천 수는 그대로다. 이름은 서버 변경 이력의 항목명('비밀글 정책'·'추천 받기')과 같다.
  {
    key: 'prvtPstPlcyCd', label: '비밀글 정책', format: shown(BOARD_SETTING_TEXT.prvtPstPlcyCd),
    impact: (value) => {
      const policy = toPrivatePostPolicy(value);
      if (policy === 'REQUIRED') return '앞으로 저장하는 글(새 글과 고친 글)은 늘 비밀글이 됩니다. 이미 있는 글은 고칠 때까지 그대로입니다.';
      if (policy === 'OPTIONAL') return '작성 화면에 비밀글 선택이 생깁니다. 이미 있는 비밀글은 계속 보호됩니다.';
      return '작성 화면에 비밀글 선택이 없습니다. 이미 있는 비밀글은 계속 보호됩니다.';
    },
  },
  {
    key: 'rcmdtnUseYn', label: '추천 받기', format: shown(BOARD_SETTING_TEXT.rcmdtnUseYn),
    impact: (value) => (value === 'N' ? '새 추천만 막습니다. 쌓인 추천 수는 그대로이고, 각자 자기 추천은 거둘 수 있습니다.' : null),
  },
];

/**
 * 지정 용도의 이름 — 서버의 영구 삭제 거부(B007, BoardErrorCode.DESIGNATED_BOARD_NOT_PURGEABLE) 문구와 같은 말이다. 순서는 서버가
 * 싣는 순서(공지·FAQ·업무·Q&A·위키)를 따른다.
 */
const DESIGNATION_PURPOSES: Readonly<Record<string, string>> = {
  NOTICE: '공지사항(업무 홈 공지 카드)',
  FAQ: '자주 묻는 질문(공개 FAQ·도움말)',
  TASK: '업무게시판(업무 홈 카드)',
  QNA: '질의응답(도움말 1:1 문의·지식 허브)',
  WIKI: '위키(지식 허브 위키 탭)',
};
/** 서버가 지정 게시판의 영구 삭제를 거부할 때의 오류 코드(409). */
const DESIGNATED_BOARD_NOT_PURGEABLE = 'B007';

/** 메뉴 관리에서 돌아올 때의 단추 문구 — 메뉴 관리가 그대로 보인다. */
const MENU_RETURN_LABEL = '게시판 설정으로 돌아가기';

// [2026-10-23 ADR-0040 결정 5] 상단 고정 상한·기본 일수의 범위는 생성 스키마(서버 @Min·@Max)에서 온다 — 화면 상수를 두지 않는다.
const PIN_LIMIT_GENERATED = BoardMasterUpdateRequestSchema.shape.upendFixUplmtNocs.unwrap();
const PIN_DAYS_GENERATED = BoardMasterUpdateRequestSchema.shape.upendFixBscDayCnt.unwrap();
const PIN_LIMIT_RANGE = generatedRange(PIN_LIMIT_GENERATED);
const PIN_DAYS_RANGE = generatedRange(PIN_DAYS_GENERATED);

const settingsSchema = BoardMasterUpdateRequestSchema.pick({ bbsTtl: true, bbsExpln: true }).extend({
  bbsTtl: BoardMasterUpdateRequestSchema.shape.bbsTtl.trim().min(1, '게시판 명칭을 입력해 주세요.'),
  bbsExpln: BoardMasterUpdateRequestSchema.shape.bbsExpln.unwrap().trim().optional(),
  atchPsbltyFileQty: z.number({ message: '첨부 파일 수를 숫자로 입력해 주세요.' })
    .int('첨부 파일 수는 정수여야 합니다.')
    .min(0, '첨부 파일 수는 0 이상이어야 합니다.')
    .max(SERVER_MAX_FILES_PER_REQUEST, `서버는 한 번에 ${SERVER_MAX_FILES_PER_REQUEST}개까지 받습니다.`),
  // 0 은 게시판 상한 없음(서버 전역 상한만 적용)이다 — 서버도 0 이하·비어 있음을 상한 없음으로 본다.
  atchPsbltyFileSzMb: z.number({ message: '파일당 크기를 숫자로 입력해 주세요.' })
    .min(0, '파일당 크기는 0 이상이어야 합니다.')
    .max(SERVER_MAX_FILE_SIZE_MB, `서버는 파일 하나당 ${SERVER_MAX_FILE_SIZE_MB}MB 까지 받습니다.`),
  upendFixUplmtNocs: pinCountSchema({ subject: '상단 고정 상한은', object: '상단 고정 상한을' }, '건', PIN_LIMIT_GENERATED),
  upendFixBscDayCnt: pinCountSchema({ subject: '상단 고정 기본 일수는', object: '상단 고정 기본 일수를' }, '일', PIN_DAYS_GENERATED),
});

const settingsLabels = {
  bbsTtl: '게시판 명칭',
  bbsExpln: '게시판 소개',
  atchPsbltyFileQty: '첨부 파일 수',
  atchPsbltyFileSzMb: '파일당 크기(MB)',
  upendFixUplmtNocs: '상단 고정 상한',
  upendFixBscDayCnt: '상단 고정 기본 일수',
};

function baselineOf(detail: BoardMasterDetail): Record<FieldKey, string | number> {
  return {
    bbsTtl: detail.bbsTtl,
    bbsExpln: detail.bbsExpln ?? '',
    useYn: detail.useYn,
    ansYn: detail.ansYn ?? 'Y',
    stsfdgYn: detail.stsfdgYn ?? 'Y',
    fileAtchPsbltyYn: detail.fileAtchPsbltyYn,
    atchPsbltyFileQty: detail.atchPsbltyFileQty,
    // 비어 있는 옛 게시판은 0(전역 상한)과 같은 뜻이다. 다른 값으로 채우면 저장할 때 설정이 조용히 바뀐다.
    atchPsbltyFileSz: detail.atchPsbltyFileSz ?? 0,
    // NOT NULL DEFAULT 'N' 컬럼이라 응답에 늘 있다(D6 기존 게시판 기본값은 받지 않음). 보이는 값과 저장 요청이 같은 판정을 쓰게 Y 만 받음이다.
    rsvtPstgPsbltyYn: detail.rsvtPstgPsbltyYn === 'Y' ? 'Y' : 'N',
    // [2026-10-23 ADR-0040 결정 5·6] 세 값도 NOT NULL DEFAULT('N'·5·30) 컬럼이라 응답에 늘 있다 — 서버 값을 그대로 둔다.
    upendFixPsbltyYn: detail.upendFixPsbltyYn === 'Y' ? 'Y' : 'N',
    upendFixUplmtNocs: detail.upendFixUplmtNocs,
    upendFixBscDayCnt: detail.upendFixBscDayCnt,
    // [2026-10-23 ADR-0040 결정 6·7] 두 값도 NOT NULL DEFAULT('NONE'·'Y') 컬럼이라 응답에 늘 있다. 보이는 값과 저장 요청이 같은 판정을 쓴다.
    prvtPstPlcyCd: toPrivatePostPolicy(detail.prvtPstPlcyCd),
    rcmdtnUseYn: detail.rcmdtnUseYn === 'N' ? 'N' : 'Y',
  };
}

/** 메뉴가 어디에 보이는지 — 메뉴·접근 탭의 '보이는 그룹' 과 같은 분류다. */
function menuExposureText(exposure: MenuExposure): string {
  switch (exposure.kind) {
    case 'inactive': return '비활성 메뉴';
    case 'hidden': return '활성 · 어느 그룹에도 보이지 않음';
    case 'admin-only': return `활성 · 관리자 그룹만: ${exposure.groups.join(', ')}`;
    case 'general': return `활성 · 일반 그룹 표시: ${exposure.groups.join(', ')}`;
    case 'no-permission': return '활성 · 보이는 그룹은 확인 권한 없음';
    case 'unknown': return '활성 · 보이는 그룹은 확인 불가';
  }
}

/** 연결 메뉴를 판정하지 못한 사유. 판정했으면 null 이다 — 연결 없음·모두에게 보임으로 추정하지 않는다. */
function menuLinksUnavailable(links: BoardMenuLinks | null): string | null {
  if (links === null) return '연결 메뉴를 확인하는 중…';
  if (links.status === 'no-permission') return '메뉴 원장을 볼 권한(MENU_READ)이 없어 연결 메뉴를 확인할 수 없습니다.';
  if (links.status === 'unknown') return '메뉴 원장을 불러오지 못해 연결 메뉴를 확인할 수 없습니다. 메뉴·접근 탭에서 다시 확인하세요.';
  return null;
}

/** 연결 메뉴 목록 — 메뉴마다 위치·상태·보이는 그룹과 '메뉴 관리에서 열기'. */
function LinkedMenuList({ links, canOpenMenus, onOpen }: {
  links: readonly BoardMenuLink[];
  canOpenMenus: boolean;
  onOpen: (link: BoardMenuLink) => void;
}) {
  return (
    <div className="mt-2 space-y-2">
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.menuNo} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-medium text-foreground">{link.path.join(' › ')}</span>
            <span className="text-muted-foreground">{menuExposureText(link.exposure)}</span>
            {canOpenMenus && (
              <Button type="button" variant="outline" size="sm" aria-label={`${link.menuNm} 메뉴를 메뉴 관리에서 열기`} onClick={() => onOpen(link)}>
                메뉴 관리에서 열기
              </Button>
            )}
          </li>
        ))}
      </ul>
      {!canOpenMenus && <p className="text-xs text-muted-foreground">메뉴를 고치려면 메뉴 관리를 열 권한(메뉴 조회)이 필요합니다.</p>}
    </div>
  );
}

export function BoardSettingsTab({ detail, onReload }: {
  detail: BoardMasterDetail;
  /** 저장·충돌 뒤 최신 상세를 다시 읽는다. */
  onReload: () => Promise<unknown>;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { toast } = useToast();
  const { user } = useAuth();
  const canUpdate = canPermission(user, 'BBS_MST_UPDATE');
  const canDelete = canPermission(user, 'BBS_MST_DELETE');
  // 유효 고정 수는 게시물 목록(조회 대행 권한이면 비밀글·게시 기간 밖 글도 온다)의 고정 조건 전체 건수다 — 게시물 탭과 같은 판정.
  const canReadAllPosts = canPermission(user, 'BOARD_READ_ALL');
  const canOpenMenus = canOpenPage(user, '/admin/system/menus');
  const validation = useManualFormValidation(settingsSchema, { labels: settingsLabels });
  const [draft, setDraft] = useState<Draft>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const pendingRef = useRef(false);

  const baseline = baselineOf(detail);
  const value = (key: FieldKey) => (key in draft ? draft[key] : baseline[key]);
  const changed = (key: FieldKey) => key in draft && draft[key] !== baseline[key];
  const changes = FIELDS.filter(({ key }) => changed(key));
  const guardedNavigate = useUnsavedChanges({ dirty: changes.length > 0, pending: saving });
  const usage = boardUsageNotes(detail.bbsId, detail.designations);
  const boardType = boardTypeDisplay(detail.bbsTypeCd, detail.tmpltId);
  // 비밀글 정책의 경고는 화면에 보이는 값(바꾸는 중이면 그 값)으로 계산한다 — FAQ 지정 + 필수, 질의응답 게시판 + 없음 아님(결정 7).
  const policyWarnings = privatePostPolicyWarnings(detail.bbsId, detail.designations, String(value('prvtPstPlcyCd')));
  // [2026-10-26 ADR-0043 결정 4] '비밀 문의와 공개 질문이 함께 있다' 는 지정 용도(Q&A)의 사실이다 — 화면 유형(TMPLT_QNA)으로 판정하면
  //   마법사로 새로 만든 질의응답형 게시판에도 사실이 아닌 제약을 보인다. 비밀글 경고와 같은 판정(isHelpQnaBoard)을 쓴다.
  const qnaDesignated = isHelpQnaBoard(detail.bbsId, detail.designations);
  const designatedPurposes = detail.designations.map((designation) => DESIGNATION_PURPOSES[designation] ?? designation);
  const designatedPurgeReason = designatedPurposes.length > 0
    ? `[${detail.bbsTtl}] 게시판은 앱이 ${designatedPurposes.join(', ')} 용도로 지정해 쓰고 있어 영구 삭제할 수 없습니다. 쓰지 않으려면 사용 안 함으로 두십시오.`
    : null;

  // 연결 메뉴는 메뉴·접근 탭과 같은 원천·판정이다. 두 원천이 모두 확정된 뒤에 판정한다(그 전에는 확인하는 중).
  const { menuSource, groupSource } = useBoardAccessSources();
  const menuLinks = useMemo(() => (menuSource === null || groupSource === null
    ? null
    : findBoardMenuLinks(detail.bbsId, menuSource, groupSource, detail.bbsTtl)),
  [detail.bbsId, detail.bbsTtl, menuSource, groupSource]);
  const linkedMenus = menuLinks?.status === 'ready' ? menuLinks.links : [];
  const activeLinkedMenus = linkedMenus.filter((link) => link.exposure.kind !== 'inactive');

  const loweringPinLimit = reviewOpen && Number(value('upendFixUplmtNocs')) < Number(baseline.upendFixUplmtNocs);
  const pinCount = useQuery({
    ...boardMasterQueryOptions.operationPosts(detail.bbsId, { page: 1, size: 1, pinned: true }),
    select: (data) => data.total,
    enabled: canReadAllPosts && loweringPinLimit && detail.bbsId.length > 0,
  });
  const activePins: ActivePins = !canReadAllPosts ? { state: 'no-permission' }
    : pinCount.isError ? { state: 'failed' }
      : typeof pinCount.data === 'number' ? { state: 'ready', count: pinCount.data }
        : { state: 'loading' };
  const hubBoard = knowledgeTabsForBoard(detail.bbsId).length > 0
    || detail.designations.some((designation) => designation === 'QNA' || designation === 'WIKI');
  const impactContext: ImpactContext = {
    communityBound: detail.cmntySn != null,
    fixedNames: [
      ...(detail.designations.some((designation) => designation === 'NOTICE' || designation === 'TASK') ? ['업무 홈 카드 제목'] : []),
      ...(hubBoard ? ['지식 허브 탭 이름'] : []),
    ],
    activePins,
  };

  const edit = (key: FieldKey, next: string | number) => {
    setDraft((current) => ({ ...current, [key]: next }));
  };

  /**
   * 메뉴 관리에서 이 메뉴를 고른 상태로 연다(menu-focus 인계). 메뉴 관리는 '게시판 설정으로 돌아가기' 로 이 탭에 돌아온다. 저장하지
   * 않은 변경이 있으면 이동 전에 확인한다 — 인계는 이동이 확정된 뒤에 둔다(취소했는데 인계만 남지 않게).
   */
  const openMenu = (link: BoardMenuLink) => {
    const screenRouter = router;
    void guardedNavigate((approvedRouter) => {
      const handedOff = handOffMenuFocus({
        menuSn: link.menuNo,
        returnTo: { route: boardOperationsHref(detail.bbsId), label: MENU_RETURN_LABEL },
      });
      if (!handedOff) {
        toast('메뉴를 넘기지 못했습니다. 브라우저 저장소를 쓸 수 없는 상태입니다. 메뉴 관리에서 직접 찾아 주세요.', 'error');
        return;
      }
      // 이동 확인을 거친 원래 라우터로 옮긴다 — 화면 라우터(useRouter)는 확인 중에 다시 부르면 이동을 버린다. 이름을 router 로 두어
      //   URL 상태 census 가 이 이동(router.push)을 그대로 센다.
      const router = approvedRouter ?? screenRouter;
      router.push('/admin/system/menus');
    });
  };

  const openReview = () => {
    if (!canUpdate || changes.length === 0) return;
    const validated = validation.validate({
      bbsTtl: String(value('bbsTtl') ?? ''),
      bbsExpln: String(value('bbsExpln') ?? ''),
      atchPsbltyFileQty: Number(value('atchPsbltyFileQty')),
      atchPsbltyFileSzMb: Number(value('atchPsbltyFileSz')) / BYTES_PER_MB,
      upendFixUplmtNocs: Number(value('upendFixUplmtNocs')),
      upendFixBscDayCnt: Number(value('upendFixBscDayCnt')),
    });
    if (validated) setReviewOpen(true);
  };

  const save = async () => {
    if (!canUpdate || pendingRef.current) return;
    // 확인 표를 연 뒤에도 쓰기 직전에 같은 규칙으로 다시 본다 — 저장 경로가 검증을 건너뛰지 않게 한다.
    const validated = validation.validate({
      bbsTtl: String(value('bbsTtl') ?? ''),
      bbsExpln: String(value('bbsExpln') ?? ''),
      atchPsbltyFileQty: Number(value('atchPsbltyFileQty')),
      atchPsbltyFileSzMb: Number(value('atchPsbltyFileSz')) / BYTES_PER_MB,
      upendFixUplmtNocs: Number(value('upendFixUplmtNocs')),
      upendFixBscDayCnt: Number(value('upendFixBscDayCnt')),
    });
    if (!validated) {
      setReviewOpen(false);
      return;
    }
    const request: BoardMasterUpdateRequest = {
      bbsTtl: validated.bbsTtl,
      bbsExpln: validated.bbsExpln ?? '',
      ansPsbltyYn: detail.ansPsbltyYn === 'Y' ? 'Y' : 'N',
      fileAtchPsbltyYn: value('fileAtchPsbltyYn') === 'N' ? 'N' : 'Y',
      atchPsbltyFileQty: validated.atchPsbltyFileQty,
      atchPsbltyFileSz: Math.round(validated.atchPsbltyFileSzMb * BYTES_PER_MB),
      useYn: value('useYn') === 'N' ? 'N' : 'Y',
      ansYn: value('ansYn') === 'N' ? 'N' : 'Y',
      stsfdgYn: value('stsfdgYn') === 'N' ? 'N' : 'Y',
      rsvtPstgPsbltyYn: value('rsvtPstgPsbltyYn') === 'Y' ? 'Y' : 'N',
      upendFixPsbltyYn: value('upendFixPsbltyYn') === 'Y' ? 'Y' : 'N',
      upendFixUplmtNocs: validated.upendFixUplmtNocs,
      upendFixBscDayCnt: validated.upendFixBscDayCnt,
      prvtPstPlcyCd: toPrivatePostPolicy(value('prvtPstPlcyCd')),
      rcmdtnUseYn: value('rcmdtnUseYn') === 'N' ? 'N' : 'Y',
      version: detail.version,
    };
    pendingRef.current = true;
    setSaving(true);
    try {
      await boardAdminService.updateBoardMaster(detail.bbsId, BoardMasterUpdateRequestSchema.parse(request));
      toast('게시판 설정을 저장했습니다.', 'success');
      setDraft({});
      setConflict(false);
      setReviewOpen(false);
      // 이름·사용 여부는 목록·이용 화면 메타·선택지·커뮤니티 게시판 목록에도 보인다 — 모두 다시 읽는다(변경 이력 포함).
      await Promise.all([onReload(), invalidateBoardCaches(queryClient)]);
    } catch (error) {
      if (isConflictError(error)) {
        // 덮어쓰지 않았다 — 최신 값을 다시 읽고, 입력은 남겨 같은 확인 표로 다시 비교하게 한다(결정 10).
        setConflict(true);
        setReviewOpen(false);
        toast(extractErrorMessage(error, '다른 사용자가 먼저 수정했습니다. 저장하지 않았습니다.'), 'error');
        await onReload();
      } else {
        const fieldErrors = extractFieldErrors(error);
        if (fieldErrors) {
          setReviewOpen(false);
          validation.setFormErrors(fieldErrors);
        } else toast(extractErrorMessage(error, '게시판 설정을 저장하지 못했습니다.'), 'error');
      }
    } finally {
      pendingRef.current = false;
      setSaving(false);
    }
  };

  /**
   * 영구 삭제 전 확인을 연다. 글이 한 번이라도 있었던 게시판은 따를 수 있는 사실만 말하고 확인을 열지 않는다. 지정 게시판은 단추가
   * 꺼져 있어 여기 오지 않는다(서버도 B007 로 거부한다).
   */
  const reviewPurge = async () => {
    if (!canDelete || pendingRef.current || designatedPurgeReason) return;
    pendingRef.current = true;
    setDeleting(true);
    try {
      const deletable = await boardAdminService.isBoardMasterDeletable(detail.bbsId);
      if (!deletable) {
        await confirm({
          title: '영구 삭제할 수 없습니다',
          message: `[${detail.bbsTtl}] 게시판은 글이 한 번이라도 있었던 게시판이라 영구 삭제할 수 없습니다. 지운 글도 기록이 남아 있습니다. 쓰지 않을 게시판은 사용 안 함 상태로 두십시오.`,
          confirmText: '확인',
          variant: 'default',
        });
        return;
      }
      setPurgeOpen(true);
    } catch (error) {
      toast(extractErrorMessage(error, '영구 삭제할 수 있는지 확인하지 못했습니다.'), 'error');
    } finally {
      pendingRef.current = false;
      setDeleting(false);
    }
  };

  const purge = async () => {
    if (!canDelete || pendingRef.current) return;
    pendingRef.current = true;
    setDeleting(true);
    try {
      await boardAdminService.deleteBoardMasterPhysically(detail.bbsId);
      toast('게시판을 영구 삭제했습니다.', 'success');
      setPurgeOpen(false);
      // 지운 게시판의 상세는 캐시에서 먼저 뺀다 — 아직 열린 이 화면이 그 게시판을 다시 읽어 404 오류를 띄우지 않게 한다.
      void invalidateBoardCaches(queryClient, { removedBbsId: detail.bbsId });
      router.push('/admin/community/boards/master');
    } catch (error) {
      if (summarizeError(error).code === DESIGNATED_BOARD_NOT_PURGEABLE) {
        // 화면이 모르던 지정 게시판이다(설정이 바뀐 뒤 연 화면 등). 서버 사유를 그대로 보이고 최신 지정 용도를 다시 읽는다.
        setPurgeOpen(false);
        toast(extractErrorMessage(error, '앱이 지정 용도로 쓰는 게시판이라 영구 삭제할 수 없습니다.'), 'error');
        await onReload();
      } else toast(extractErrorMessage(error, '영구 삭제하지 못했습니다.'), 'error');
    } finally {
      pendingRef.current = false;
      setDeleting(false);
    }
  };

  const switchRow = (key: 'useYn' | 'ansYn' | 'stsfdgYn' | 'fileAtchPsbltyYn' | 'rsvtPstgPsbltyYn' | 'upendFixPsbltyYn' | 'rcmdtnUseYn', label: string, hint?: string) => (
    <div className="flex items-center justify-between gap-3">
      <div className="space-y-0.5">
        <label htmlFor={`board-settings-${key}`} className="cursor-pointer text-[length:var(--font-size-body)] text-foreground">{label}</label>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <Switch
        id={`board-settings-${key}`}
        checked={value(key) !== 'N'}
        disabled={!canUpdate || saving}
        onCheckedChange={(checked) => edit(key, checked ? 'Y' : 'N')}
      />
    </div>
  );

  // [2026-10-26 ADR-0043 결정 3] 귀속 커뮤니티의 이름·이용 가능 여부는 커뮤니티 기능이 foundation 포트로 알려 준다. 모르면 확인 불가다.
  const community = detail.cmntySn != null ? detail.community : undefined;
  const communityName = community?.cmntyNm ?? null;
  const communityInUse = community?.inUse ?? null;
  const unavailableMenus = menuLinksUnavailable(menuLinks);

  return (
    <div className="space-y-6">
      {(usage.length > 0 || qnaDesignated) && (
        <section aria-labelledby="board-settings-constraints" className="space-y-2 rounded-md border border-warning/40 bg-warning/10 p-4">
          <h2 id="board-settings-constraints" className="text-[length:var(--font-size-body)] font-semibold text-foreground">이 게시판의 고정 제약</h2>
          <ul className="list-disc space-y-1 pl-5 text-[length:var(--font-size-body)] text-muted-foreground">
            {usage.map((note) => <li key={note}>{note}</li>)}
            {qnaDesignated && <li>질의응답 지정 게시판이라 비밀 문의(도움말 1:1 문의)와 공개 질문(지식 허브 질의응답)이 함께 있습니다.</li>}
          </ul>
        </section>
      )}

      {conflict && (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-[length:var(--font-size-body)] text-foreground">
          다른 사용자가 먼저 수정해 저장하지 않았습니다. 최신 값을 다시 불러왔습니다. 변경 내용을 다시 확인한 뒤 저장하세요.
        </p>
      )}

      <form
        aria-labelledby="board-settings-basic"
        className="space-y-[var(--form-gap)]"
        noValidate
        onSubmit={(event) => { event.preventDefault(); openReview(); }}
      >
        <FormErrorSummary errors={validation.errors} labels={settingsLabels} onNavigate={validation.focusError} />
        <fieldset className="space-y-[var(--form-gap)] rounded-md border border-border p-4">
          <legend id="board-settings-basic" className="px-1 text-[length:var(--font-size-body)] font-semibold text-foreground">기본</legend>
          <div className="space-y-1.5">
            <Label htmlFor="board-settings-name">게시판 명칭</Label>
            <Input
              id="board-settings-name"
              {...validation.fieldProps('bbsTtl')}
              value={String(value('bbsTtl') ?? '')}
              maxLength={100}
              required
              disabled={!canUpdate || saving}
              onChange={(event) => { validation.clearError('bbsTtl'); edit('bbsTtl', event.target.value); }}
            />
            {validation.errors.bbsTtl ? <p {...validation.messageProps('bbsTtl')} className="text-xs font-bold text-destructive-emphasis" /> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="board-settings-description">게시판 소개</Label>
            <Input
              id="board-settings-description"
              {...validation.fieldProps('bbsExpln')}
              value={String(value('bbsExpln') ?? '')}
              maxLength={4000}
              disabled={!canUpdate || saving}
              onChange={(event) => { validation.clearError('bbsExpln'); edit('bbsExpln', event.target.value); }}
            />
            {validation.errors.bbsExpln ? <p {...validation.messageProps('bbsExpln')} className="text-xs font-bold text-destructive-emphasis" /> : null}
          </div>
          {switchRow('useYn', '게시판 사용', '사용 안 함이면 이용자에게 읽기·쓰기 모두 닫힙니다.')}
          <dl className="grid grid-cols-1 gap-3 text-[length:var(--font-size-body)] sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">화면 유형(만든 뒤 바꿀 수 없음)</dt>
              <dd className="text-foreground">
                {/* [2026-10-26 ADR-0043 결정 5] 이름은 템플릿으로 정하고, 유형 코드와 짝이 정본과 다르면 그 사실과 저장된 코드를 덧붙인다. */}
                {boardType.name}
                {boardType.pairMismatch && (
                  <span className="text-muted-foreground"> · {BOARD_TYPE_PAIR_MISMATCH}{boardType.storedCode ? `(저장된 코드 ${boardType.storedCode})` : ''}</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">커뮤니티 귀속(만든 뒤 바꿀 수 없음)</dt>
              {detail.cmntySn == null ? (
                <dd className="text-foreground">없음</dd>
              ) : (
                <dd className="space-y-1 text-foreground">
                  <p>
                    {communityName ?? `커뮤니티 번호 ${detail.cmntySn}(이름 확인 불가)`} — 승인 회원만 이용
                  </p>
                  <p className="text-muted-foreground">
                    커뮤니티 상태: {communityInUse === true ? '사용 중' : communityInUse === false ? '사용 중지' : '확인 불가'}
                  </p>
                  {communityInUse === false && (
                    <p role="note" className="rounded-md border border-warning/40 bg-warning/10 p-2 text-xs text-foreground">
                      사용 중지된 커뮤니티라 이용자가 커뮤니티 화면을 열 수 없습니다. 관리자 외에는 아무도 이 게시판을 쓸 수 없습니다.
                    </p>
                  )}
                  {communityInUse === null && (
                    <p className="text-xs text-muted-foreground">커뮤니티 기능이 없거나 커뮤니티를 찾지 못해 이름·상태를 확인할 수 없습니다.</p>
                  )}
                </dd>
              )}
            </div>
          </dl>
        </fieldset>

        {/*
          [2026-10-23 ADR-0040 결정 3·5·6, §5.5] 게시·고정 설정. 예약 게시는 새 미래 시작일만, 상단 고정 허용·상한은 새 고정만 막거나
          연다 — 이미 있는 글의 가시성·고정은 설정으로 바뀌지 않는다. 켤 때 기록용 미래 시작일 글이 전환 진단 대상이라는 사실을 확인 표
          아래에서 알린다. 상한·기본 일수는 고정을 받지 않는 동안 읽기 전용이다(값은 그대로 저장된다).
        */}
        <fieldset className="space-y-[var(--form-gap)] rounded-md border border-border p-4">
          <legend className="px-1 text-[length:var(--font-size-body)] font-semibold text-foreground">게시·고정</legend>
          {switchRow('rsvtPstgPsbltyYn', '예약 게시',
            '켜면 새 글에 오늘보다 뒤의 시작일을 받습니다. 그 글은 시작일까지 작성자와 게시판 관리자에게만 보입니다. 기존 게시판 기본값: 받지 않음.')}
          {switchRow('upendFixPsbltyYn', '상단 고정 허용',
            '켜면 운영 화면에서 글을 게시판 목록 맨 위에 고정할 수 있습니다. 끄면 새 고정만 막습니다. 기존 게시판 기본값: 허용 안 함.')}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="board-settings-pin-limit">상단 고정 상한(건)</Label>
              <Input
                id="board-settings-pin-limit"
                type="number"
                min={PIN_LIMIT_RANGE.min ?? undefined}
                max={PIN_LIMIT_RANGE.max ?? undefined}
                {...validation.fieldProps('upendFixUplmtNocs')}
                aria-describedby={[validation.fieldProps('upendFixUplmtNocs')['aria-describedby'], 'board-settings-pin-limit-hint'].filter(Boolean).join(' ')}
                value={Number.isNaN(Number(value('upendFixUplmtNocs'))) ? '' : String(value('upendFixUplmtNocs') ?? '')}
                readOnly={value('upendFixPsbltyYn') !== 'Y'}
                disabled={!canUpdate || saving}
                onChange={(event) => { validation.clearError('upendFixUplmtNocs'); edit('upendFixUplmtNocs', event.target.value === '' ? Number.NaN : Number(event.target.value)); }}
              />
              <p id="board-settings-pin-limit-hint" className="text-xs text-muted-foreground">
                고정 중인 글을 이 수까지 둡니다(게시 기간 밖의 글도 셉니다). 기존 게시판 기본값: 5건.
              </p>
              {validation.errors.upendFixUplmtNocs ? <p {...validation.messageProps('upendFixUplmtNocs')} className="text-xs font-bold text-destructive-emphasis" /> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="board-settings-pin-days">상단 고정 기본 일수(일)</Label>
              <Input
                id="board-settings-pin-days"
                type="number"
                min={PIN_DAYS_RANGE.min ?? undefined}
                max={PIN_DAYS_RANGE.max ?? undefined}
                {...validation.fieldProps('upendFixBscDayCnt')}
                aria-describedby={[validation.fieldProps('upendFixBscDayCnt')['aria-describedby'], 'board-settings-pin-days-hint'].filter(Boolean).join(' ')}
                value={Number.isNaN(Number(value('upendFixBscDayCnt'))) ? '' : String(value('upendFixBscDayCnt') ?? '')}
                readOnly={value('upendFixPsbltyYn') !== 'Y'}
                disabled={!canUpdate || saving}
                onChange={(event) => { validation.clearError('upendFixBscDayCnt'); edit('upendFixBscDayCnt', event.target.value === '' ? Number.NaN : Number(event.target.value)); }}
              />
              <p id="board-settings-pin-days-hint" className="text-xs text-muted-foreground">
                고정 종료일을 비우고 고정하면 오늘부터 이 일수 뒤까지 고정합니다. 기존 게시판 기본값: 30일.
              </p>
              {validation.errors.upendFixBscDayCnt ? <p {...validation.messageProps('upendFixBscDayCnt')} className="text-xs font-bold text-destructive-emphasis" /> : null}
            </div>
          </div>
        </fieldset>

        {/*
          [2026-10-23 ADR-0040 결정 6·7, §5.5] 비밀글 정책과 추천 받기를 '참여·첨부' 와 같은 묶음에 둔다(작성·참여). 비밀글 정책은 앞으로
          저장하는 글에만, 추천 받기는 새 추천에만 적용된다. FAQ 지정·질의응답 게시판과 맞지 않는 정책은 칸 아래에서 바로 알린다.
        */}
        <fieldset className="space-y-[var(--form-gap)] rounded-md border border-border p-4">
          <legend className="px-1 text-[length:var(--font-size-body)] font-semibold text-foreground">작성·참여·첨부</legend>
          <p className="text-xs text-muted-foreground">끄면 새 입력만 막고 이미 있는 댓글·평가·첨부·추천은 그대로 둡니다.</p>
          <div className="space-y-1.5">
            <Label htmlFor="board-settings-private-policy">비밀글 정책</Label>
            <select
              id="board-settings-private-policy"
              value={toPrivatePostPolicy(value('prvtPstPlcyCd'))}
              disabled={!canUpdate || saving}
              aria-describedby={['board-settings-private-policy-hint', policyWarnings.length > 0 ? 'board-settings-private-policy-warning' : null]
                .filter(Boolean).join(' ')}
              onChange={(event) => edit('prvtPstPlcyCd', toPrivatePostPolicy(event.target.value))}
              className="h-[var(--control-h)] w-full rounded-md border border-border bg-card px-3 text-[length:var(--font-size-body)] sm:w-60"
            >
              {PRIVATE_POST_POLICIES.map((policy) => <option key={policy} value={policy}>{PRIVATE_POST_POLICY_OPTIONS[policy]}</option>)}
            </select>
            <p id="board-settings-private-policy-hint" className="text-xs text-muted-foreground">
              정책은 앞으로 저장하는 글에 적용되고, 이미 있는 비밀글은 정책을 바꿔도 계속 보호됩니다. 기존 게시판 기본값: 없음.
            </p>
            {policyWarnings.length > 0 && (
              <div id="board-settings-private-policy-warning" role="note" className="rounded-md border border-warning/40 bg-warning/10 p-2 text-xs text-foreground">
                <ul className="list-disc space-y-1 pl-5">{policyWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
              </div>
            )}
          </div>
          {switchRow('rcmdtnUseYn', '추천 받기',
            '끄면 새 추천만 막습니다. 쌓인 추천 수는 그대로이고 각자 자기 추천은 거둘 수 있습니다. 기존 게시판 기본값: 받음.')}
          {switchRow('ansYn', '댓글 받기')}
          {switchRow('stsfdgYn', '만족도 평가 받기')}
          {switchRow('fileAtchPsbltyYn', '파일 첨부 허용')}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="board-settings-file-qty">첨부 파일 수(0 은 상한 없음)</Label>
              <Input
                id="board-settings-file-qty"
                type="number"
                min={0}
                max={SERVER_MAX_FILES_PER_REQUEST}
                {...validation.fieldProps('atchPsbltyFileQty')}
                value={String(value('atchPsbltyFileQty') ?? '')}
                disabled={!canUpdate || saving}
                onChange={(event) => { validation.clearError('atchPsbltyFileQty'); edit('atchPsbltyFileQty', event.target.value === '' ? Number.NaN : Number(event.target.value)); }}
              />
              {validation.errors.atchPsbltyFileQty ? <p {...validation.messageProps('atchPsbltyFileQty')} className="text-xs font-bold text-destructive-emphasis" /> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="board-settings-file-size">파일당 크기(MB, 0 은 전역 상한)</Label>
              <Input
                id="board-settings-file-size"
                type="number"
                min={0}
                max={SERVER_MAX_FILE_SIZE_MB}
                step="0.5"
                {...validation.fieldProps('atchPsbltyFileSzMb')}
                value={String(Number(value('atchPsbltyFileSz')) / BYTES_PER_MB)}
                disabled={!canUpdate || saving}
                onChange={(event) => { validation.clearError('atchPsbltyFileSzMb'); edit('atchPsbltyFileSz', event.target.value === '' ? Number.NaN : Math.round(Number(event.target.value) * BYTES_PER_MB)); }}
              />
              {validation.errors.atchPsbltyFileSzMb ? <p {...validation.messageProps('atchPsbltyFileSzMb')} className="text-xs font-bold text-destructive-emphasis" /> : null}
            </div>
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <span role="status" className="text-[length:var(--font-size-body)] text-muted-foreground">
            {canUpdate ? `변경 ${changes.length.toLocaleString()}건` : '설정을 바꿀 권한이 없습니다(게시판 관리 수정 권한).'}
          </span>
          {canUpdate && (
            <>
              <Button type="button" variant="outline" size="sm" disabled={changes.length === 0 || saving}
                onClick={() => { setDraft({}); validation.setFormErrors({}, false); setConflict(false); }}>
                변경 취소
              </Button>
              <Button type="submit" size="sm" disabled={changes.length === 0 || saving}>변경 내용 확인</Button>
            </>
          )}
          <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={() => setHistoryOpen(true)}>
            <History className="size-4" aria-hidden="true" />
            변경 이력
          </Button>
        </div>
      </form>

      {canDelete && (
        <section aria-labelledby="board-settings-purge" className="space-y-2 rounded-md border border-destructive/30 p-4">
          <h2 id="board-settings-purge" className="text-[length:var(--font-size-body)] font-semibold text-foreground">영구 삭제</h2>
          <p className="text-[length:var(--font-size-body)] text-muted-foreground">
            사용 안 함 게시판만 영구 삭제할 수 있고, 글이 한 번이라도 있었던 게시판은 영구 삭제할 수 없습니다(지운 글도 기록이 남습니다).
            앱이 지정해 쓰는 게시판(공지·FAQ·업무·질의응답·위키)도 영구 삭제할 수 없습니다.
          </p>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="gap-1.5"
            disabled={detail.useYn !== 'N' || designatedPurgeReason !== null || deleting || saving}
            aria-describedby={designatedPurgeReason ? 'board-settings-purge-designated' : undefined}
            aria-busy={(deleting && !purgeOpen) || undefined}
            onClick={() => void reviewPurge()}
          >
            {deleting && !purgeOpen ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />}
            게시판 영구 삭제
          </Button>
          {designatedPurgeReason
            ? <p id="board-settings-purge-designated" className="text-xs text-muted-foreground">{designatedPurgeReason}</p>
            : detail.useYn !== 'N' && <p className="text-xs text-muted-foreground">먼저 게시판 사용을 사용 안 함으로 바꿔 저장하세요.</p>}
        </section>
      )}

      <StandardModal
        isOpen={reviewOpen}
        onClose={() => { if (!saving) setReviewOpen(false); }}
        closeDisabled={saving}
        title="변경 내용 확인"
        maxWidth="3xl"
        footer={(
          <>
            <Button type="button" variant="outline" disabled={saving} onClick={() => setReviewOpen(false)}>돌아가기</Button>
            <Button type="button" disabled={saving} aria-busy={saving || undefined} onClick={() => void save()}>
              {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {saving ? '저장 중…' : '설정 저장'}
            </Button>
          </>
        )}
      >
        <div className="space-y-3 pt-2">
          <div className="relative overflow-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">바꿀 설정</caption>
              <thead className="bg-muted">
                <tr>{['항목', '현재', '변경 후', '영향'].map((title) => <th key={title} scope="col" className="p-3">{title}</th>)}</tr>
              </thead>
              <tbody>
                {changes.map((field) => (
                  <tr key={field.key} className="border-t border-border">
                    <th scope="row" className="p-3 font-medium">{field.label}</th>
                    <td className="p-3">{field.format(baseline[field.key])}</td>
                    <td className="p-3">{field.format(draft[field.key])}</td>
                    <td className="p-3 text-muted-foreground">{field.impact?.(draft[field.key], baseline[field.key], impactContext) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {draft.rsvtPstgPsbltyYn === 'Y' && baseline.rsvtPstgPsbltyYn !== 'Y' && (
            <p role="note" className="rounded-md border border-warning/40 bg-warning/10 p-3 text-[length:var(--font-size-body)] text-foreground">
              예약 게시를 켜도 이미 있는 글은 바뀌지 않습니다. 예전에 기록용으로 남긴 미래 시작일 글은 그 시작일까지 이미 숨겨져 있습니다
              (전환 진단 대상). 그런 글을 바로 공개하려면 게시물 탭의 일정 바꾸기로 시작일을 당기세요.
            </p>
          )}
          {'prvtPstPlcyCd' in draft && draft.prvtPstPlcyCd !== baseline.prvtPstPlcyCd && policyWarnings.length > 0 && (
            <div role="note" className="rounded-md border border-warning/40 bg-warning/10 p-3 text-[length:var(--font-size-body)]">
              <p className="font-medium text-foreground">바꾸는 비밀글 정책이 이 게시판의 쓰임과 맞지 않을 수 있습니다.</p>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">{policyWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </div>
          )}
          {draft.useYn === 'N' && usage.length > 0 && (
            <div role="note" className="rounded-md border border-warning/40 bg-warning/10 p-3 text-[length:var(--font-size-body)]">
              <p className="font-medium text-foreground">이 게시판을 앱이 직접 씁니다. 사용 안 함으로 바꾸면 아래에서 보이지 않습니다.</p>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">{usage.map((note) => <li key={note}>{note}</li>)}</ul>
            </div>
          )}
          {/*
            [2026-10-26 ADR-0043 SET-03] 사용 안 함으로 바꿔도 메뉴는 그대로 남아 일반 그룹에 계속 보일 수 있다. 이 게시판을 가리키는 활성
            메뉴와 보이는 그룹을 나열하고 메뉴 관리로 넘긴다 — 메뉴를 함께 끄는 일은 메뉴 관리 권한의 몫이라 자동으로 하지 않는다.
          */}
          {changed('useYn') && draft.useYn === 'N' && (
            <section aria-labelledby="board-settings-review-menus-closing" className="rounded-md border border-border p-3 text-[length:var(--font-size-body)]">
              <h3 id="board-settings-review-menus-closing" className="font-medium text-foreground">이 게시판을 가리키는 활성 메뉴</h3>
              {unavailableMenus !== null ? (
                <p role={menuLinks === null ? 'status' : undefined} className="mt-1 text-muted-foreground">{unavailableMenus}</p>
              ) : activeLinkedMenus.length === 0 ? (
                <p className="mt-1 text-muted-foreground">이 게시판을 가리키는 활성 메뉴가 없습니다.</p>
              ) : (
                <>
                  <p className="mt-1 text-muted-foreground">
                    사용 안 함으로 바꿔도 아래 메뉴는 그대로 보입니다. 메뉴를 누른 이용자는 이 게시판을 열 수 없습니다. 메뉴는 메뉴 관리에서
                    따로 정리합니다 — 설정을 저장한 뒤 메뉴·접근 탭에서 열어도 됩니다.
                  </p>
                  <LinkedMenuList links={activeLinkedMenus} canOpenMenus={canOpenMenus} onOpen={openMenu} />
                </>
              )}
            </section>
          )}
          {/* [2026-10-26 ADR-0043 SET-06] 이름을 바꿔도 연결 메뉴 이름은 그대로다 — 연결 메뉴가 있으면 메뉴 관리로 넘긴다. */}
          {changed('bbsTtl') && linkedMenus.length > 0 && (
            <section aria-labelledby="board-settings-review-menus-renaming" className="rounded-md border border-border p-3 text-[length:var(--font-size-body)]">
              <h3 id="board-settings-review-menus-renaming" className="font-medium text-foreground">이름이 그대로 남는 연결 메뉴</h3>
              <p className="mt-1 text-muted-foreground">메뉴 이름도 바꾸려면 메뉴 관리에서 고칩니다.</p>
              <LinkedMenuList links={linkedMenus} canOpenMenus={canOpenMenus} onOpen={openMenu} />
            </section>
          )}
        </div>
      </StandardModal>

      {/*
        [2026-10-26 ADR-0043 1차 WIZ-08] 영구 삭제 확인. 메뉴는 게시판을 지워도 남아 없는 게시판을 가리킨다 — 지우기 전에 이 게시판을
        가리키는 메뉴를 보이고 메뉴 관리로 넘긴다. 메뉴 정리를 강제하지는 않는다(메뉴 저장은 메뉴 관리 권한의 몫이다).
      */}
      <StandardModal
        isOpen={purgeOpen}
        onClose={() => { if (!deleting) setPurgeOpen(false); }}
        closeDisabled={deleting}
        title="게시판 영구 삭제"
        maxWidth="2xl"
        footer={(
          <>
            <Button type="button" variant="outline" disabled={deleting} onClick={() => setPurgeOpen(false)}>취소</Button>
            <Button type="button" variant="destructive" disabled={deleting} aria-busy={deleting || undefined} onClick={() => void purge()}>
              {deleting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {deleting ? '게시판 영구 삭제 중…' : '영구 삭제'}
            </Button>
          </>
        )}
      >
        <div className="space-y-3 pt-2 text-[length:var(--font-size-body)]">
          <p className="text-foreground">[{detail.bbsTtl}] 게시판과 그 설정을 영구 삭제합니다. 되돌릴 수 없습니다.</p>
          <section aria-labelledby="board-settings-purge-menus" className="rounded-md border border-border p-3">
            <h3 id="board-settings-purge-menus" className="font-medium text-foreground">이 게시판을 가리키는 메뉴</h3>
            {unavailableMenus !== null ? (
              <p role={menuLinks === null ? 'status' : undefined} className="mt-1 text-muted-foreground">{unavailableMenus}</p>
            ) : linkedMenus.length === 0 ? (
              <p className="mt-1 text-muted-foreground">이 게시판을 가리키는 메뉴가 없습니다.</p>
            ) : (
              <>
                <p className="mt-1 text-muted-foreground">
                  영구 삭제해도 아래 메뉴는 남아 없는 게시판을 가리킵니다. 먼저 메뉴 관리에서 정리하는 것이 좋습니다.
                </p>
                <LinkedMenuList links={linkedMenus} canOpenMenus={canOpenMenus} onOpen={openMenu} />
              </>
            )}
          </section>
        </div>
      </StandardModal>

      {historyOpen && (
        <BoardChangeHistoryDialog bbsId={detail.bbsId} boardName={detail.bbsTtl} onClose={() => setHistoryOpen(false)} />
      )}
    </div>
  );
}
