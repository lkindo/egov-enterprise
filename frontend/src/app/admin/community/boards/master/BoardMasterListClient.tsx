'use client';

import { useRef, useState } from 'react';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus,
  Settings2,
  ArrowRight,
  Zap,
  Trash2,
  AlertTriangle,
  Lock,
  Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { boardAdminService, BoardMaster } from '@/services/foundation/system/BoardAdminService';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useToast } from '@/app/components/ui/toast';
import { useAuth } from '@/contexts/AuthContext';
import { isAdministrativeRole } from '@/lib/auth/administrative-role';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { BoardMasterDtoSchema } from '@/types/generated-zod';

export const boardMasterEditSchema = BoardMasterDtoSchema.pick({
  bbsTtl: true,
  bbsExpln: true,
  useYn: true,
}).extend({
  bbsTtl: BoardMasterDtoSchema.shape.bbsTtl.trim()
    .min(1, '게시판 명칭을 입력해 주세요.'),
  bbsExpln: BoardMasterDtoSchema.shape.bbsExpln.unwrap().trim().optional(),
  useYn: z.string().pipe(BoardMasterDtoSchema.shape.useYn),
});

const boardMasterValidationLabels = {
  bbsTtl: '게시판 명칭',
  bbsExpln: '게시판 소개',
  useYn: '서비스 활성화 상태',
};

type BulkPendingAction = 'activate' | 'deactivate' | 'purge';

/**
 * 첨부 파일 허용 용량 기본값(5MB).
 * 백엔드 BoardMasterDto 는 atchPsbltyFileSz 에 @NotNull 을 요구하지만 물리 컬럼은 nullable 이라
 * 레거시 행은 null 일 수 있다. 생성 마법사(BoardMakerWizard)와 동일한 기본값으로 보정한다.
 */
const DEFAULT_ATCH_PSBLTY_FILE_SZ = 5242880;


export function BoardMasterListClient() {
  const router = useRouter();
  const { user } = useAuth();
  const confirm = useConfirm();
  const { toast } = useToast();
  const [searchWrd, setSearchWrd] = useState('');
  
  // Settings Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<BoardMaster | null>(null);
  const [editData, setEditData] = useState<Partial<BoardMaster>>({});
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const savePendingRef = useRef(false);
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null);
  const deletePendingRef = useRef(false);
  const [bulkPendingAction, setBulkPendingAction] = useState<BulkPendingAction | null>(null);
  const bulkPendingRef = useRef(false);
  const validation = useManualFormValidation(boardMasterEditSchema, { labels: boardMasterValidationLabels });

  const { data: boardData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['boardMasters', searchWrd],
    queryFn: () => boardAdminService.getBoardMasterList({ searchWrd })
  });
  const boardList = (boardData?.list || []) as BoardMaster[];

  // 감사 P1-5: 과거 "32 / 1.2k / Optimal / L4" 는 어떤 데이터에서도 산출되지 않는 고정 문자열이었다.
  // 실제 조회 결과로 계산 가능한 지표만 남기고 나머지 카드는 삭제했다.
  const totalCount = boardData?.total ?? boardList.length;
  const activeCount = boardList.filter((b) => b.useYn === 'Y').length;
  const standbyCount = boardList.filter((b) => b.useYn !== 'Y').length;

  /**
   * 편집 모달 진입.
   * 목록 API 의 프로젝션(BoardMasterService#toDto)은 bbsId/bbsTtl/bbsTypeCd/bbsAtrbCd/tmpltId/useYn/crtDt 만 담고
   * bbsExpln·atchPsbltyFileSz 등은 누락한다. 따라서 상세 조회로 전체 필드를 확보한 뒤 시드해야
   * 저장 시 필수 필드(@NotBlank bbsTypeCd/bbsAtrbCd, @NotNull atchPsbltyFileSz)가 유실되지 않는다.
   */
  const handleEdit = async (board: BoardMaster) => {
    if (
      !board.bbsId
      || savePendingRef.current
      || deletePendingRef.current
      || bulkPendingRef.current
    ) return;
    validation.setFormErrors({}, false);
    setIsDetailLoading(true);
    try {
      const detail = await boardAdminService.getBoardMaster(board.bbsId);
      setSelectedBoard(detail);
      setEditData({ ...detail });
    } catch (err) {
      // 상세 조회 실패 시에도 편집은 가능하게 하되, 목록 값만으로는 필수 필드가 부족할 수 있음을 알린다.
      setSelectedBoard(board);
      setEditData({ ...board });
      toast(extractErrorMessage(err, '게시판 상세 정보를 불러오지 못했습니다. 일부 설정이 누락된 상태로 표시됩니다.'), 'error');
    } finally {
      setIsDetailLoading(false);
      setIsModalOpen(true);
    }
  };

  const handleSave = async () => {
    if (!selectedBoard || !selectedBoard.bbsId) return;
    if (savePendingRef.current || deletePendingRef.current || bulkPendingRef.current) return;

    // 백엔드 BoardMasterDto 는 bbsTypeCd/bbsAtrbCd(@NotBlank), atchPsbltyFileSz(@NotNull), useYn(@NotBlank) 을
    // 모두 요구한다. 모달이 편집하는 3개 필드만 보내면 @Valid 단계에서 항상 400 이 떨어지므로 기존 값을 병합한다.
    // 단, spring.jackson `fail-on-unknown-properties: true` 이고 crtDt/mdfcnDt 는 LocalDateTime 이므로
    // 응답 객체를 통째로 되돌려보내지 않고 서버가 실제로 사용하는 필드만 명시적으로 조립한다.
    const merged = { ...selectedBoard, ...editData };
    const validated = validation.validate({
      bbsTtl: merged.bbsTtl ?? '',
      bbsExpln: merged.bbsExpln ?? '',
      useYn: merged.useYn ?? '',
    });
    if (!validated) return;

    const payload: Partial<BoardMaster> = {
      bbsId: selectedBoard.bbsId,
      bbsTtl: validated.bbsTtl,
      bbsExpln: validated.bbsExpln,
      bbsTypeCd: merged.bbsTypeCd,
      bbsAtrbCd: merged.bbsAtrbCd,
      ansPsbltyYn: merged.ansPsbltyYn,
      fileAtchPsbltyYn: merged.fileAtchPsbltyYn,
      atchPsbltyFileQty: merged.atchPsbltyFileQty,
      atchPsbltyFileSz: merged.atchPsbltyFileSz ?? DEFAULT_ATCH_PSBLTY_FILE_SZ,
      tmpltId: merged.tmpltId,
      useYn: validated.useYn,
      ansYn: merged.ansYn,
      stsfdgYn: merged.stsfdgYn
    };

    const missingFields = [
      !payload.bbsTtl?.trim() ? '게시판 명칭' : null,
      !payload.bbsTypeCd ? '게시판 유형 코드(bbsTypeCd)' : null,
      !payload.bbsAtrbCd ? '게시판 속성 코드(bbsAtrbCd)' : null,
      !payload.useYn ? '사용 여부' : null
    ].filter(Boolean) as string[];

    if (missingFields.length > 0) {
      toast(`필수 항목이 누락되어 저장할 수 없습니다: ${missingFields.join(', ')}. 생성 마법사에서 게시판 기본 설정을 먼저 완료해주십시오.`, 'error');
      return;
    }

    savePendingRef.current = true;
    setIsSaving(true);
    try {
      await boardAdminService.updateBoardMaster(selectedBoard.bbsId, payload);
      toast('게시판 설정이 업데이트되었습니다.', 'success');
      setIsModalOpen(false);
      refetch();
    } catch (err) {
      const fieldErrors = extractFieldErrors(err);
      if (fieldErrors) validation.setFormErrors(fieldErrors);
      else toast(extractErrorMessage(err, '업데이트 중 오류가 발생했습니다.'), 'error');
    } finally {
      savePendingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleModalOpenChange = (open: boolean) => {
    if (
      !open
      && (savePendingRef.current || deletePendingRef.current || bulkPendingRef.current)
    ) return;
    setIsModalOpen(open);
  };

  const handleDelete = async (board: BoardMaster) => {
    if (!board.bbsId) return;
    if (deletePendingRef.current || bulkPendingRef.current || savePendingRef.current) return;

    deletePendingRef.current = true;
    setDeletingBoardId(board.bbsId);

    try {
      if (board.useYn === 'Y') {
        // 1. 활성 상태인 경우 -> Soft Delete (대기 상태 전환)
        try {
          const isConfirmed = await confirm({
            title: '게시판 서비스 비활성화',
            message: `[${board.bbsTtl}] 게시판을 대기 상태로 전환(비활성화)하시겠습니까?`,
            confirmText: '비활성화',
            variant: 'destructive'
          });

          if (!isConfirmed) return;

          await boardAdminService.deleteBoardMaster(board.bbsId, 'admin');
          toast('게시판이 비활성화(대기) 상태로 전환되었습니다.', 'success');
          refetch();
        } catch {
          toast('비활성화 처리 중 오류가 발생했습니다.', 'error');
        }
        return;
      }

      // 2. 대기(N) 상태인 경우 -> Hard Delete (물리 삭제)
      try {
        const deletable = await boardAdminService.isBoardMasterDeletable(board.bbsId);
        
        if (!deletable) {
          await confirm({
            title: '영구 삭제 불가',
            message: `[${board.bbsTtl}] 게시판 내부에 등록된 게시글 데이터가 존재하여 완전히 삭제할 수 없습니다. 관련 게시글을 먼저 모두 삭제해주십시오.`,
            confirmText: '확인',
            variant: 'default'
          });
          return;
        }

        const isConfirmed = await confirm({
          title: '게시판 영구 물리 삭제',
          message: `[${board.bbsTtl}] 게시판 마스터와 모든 설정을 데이터베이스에서 완전히 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
          confirmText: '영구 삭제',
          variant: 'destructive'
        });

        if (isConfirmed) {
          await boardAdminService.deleteBoardMasterPhysically(board.bbsId);
          toast('게시판 마스터 데이터가 완전히 말소되었습니다.', 'success');
          refetch();
        }
      } catch (error) {
        const errMsg = extractErrorMessage(error, '영구 삭제 처리 중 오류가 발생했습니다.');
        toast(errMsg, 'error');
      }
    } finally {
      deletePendingRef.current = false;
      setDeletingBoardId(null);
    }
  };

  const runBulkAction = async (action: BulkPendingAction, operation: () => Promise<void>) => {
    if (bulkPendingRef.current || deletePendingRef.current || savePendingRef.current) return;
    bulkPendingRef.current = true;
    setBulkPendingAction(action);
    try {
      await operation();
    } finally {
      bulkPendingRef.current = false;
      setBulkPendingAction(null);
    }
  };

  const handleBulkStatusChange = async (
    items: BoardMaster[],
    status: 'Y' | 'N',
    action: Extract<BulkPendingAction, 'activate' | 'deactivate'>,
  ) => {
    const ids = items.map(item => item.bbsId).filter(Boolean) as string[];
    if (ids.length === 0) return;

    await runBulkAction(action, async () => {
      try {
        await boardAdminService.batchUpdateBoardMasterStatus(ids, status);
        toast(
          `${items.length}개의 게시판이 일괄 ${status === 'Y' ? '활성화' : '비활성화'}되었습니다.`,
          status === 'Y' ? 'success' : 'info',
        );
        refetch();
      } catch (err) {
        toast(extractErrorMessage(
          err,
          status === 'Y' ? '일괄 활성화 중 오류가 발생했습니다.' : '일괄 비활성화 중 오류가 발생했습니다.',
        ), 'error');
      }
    });
  };

  const handleBulkPurge = async (items: BoardMaster[]) => {
    const ids = items.map(item => item.bbsId).filter(Boolean) as string[];
    if (ids.length === 0) return;

    await runBulkAction('purge', async () => {
      try {
        const activeBoards = items.filter(item => item.useYn === 'Y');
        if (activeBoards.length > 0) {
          await confirm({
            title: '일괄 영구 삭제 불가',
            message: `선택한 항목 중 활성 상태인 게시판([${activeBoards.map(b => b.bbsTtl).join(', ')}])이 포함되어 있습니다. 활성 상태인 게시판을 먼저 대기 상태로 변경한 후 다시 일괄 삭제를 시도해주십시오.`,
            confirmText: '확인',
            variant: 'default'
          });
          return;
        }

        const isConfirmed = await confirm({
          title: '선택한 게시판 일괄 영구 말소',
          message: `선택하신 ${items.length}개의 게시판과 모든 관련 설정을 데이터베이스에서 완전히 영구 말소하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
          confirmText: '일괄 영구 삭제',
          variant: 'destructive'
        });
        if (!isConfirmed) return;

        await boardAdminService.batchDeleteBoardMastersPhysically(ids);
        toast('선택한 게시판 마스터 데이터가 모두 영구 말소되었습니다.', 'success');
        refetch();
      } catch (err) {
        toast(extractErrorMessage(err, '일괄 영구 삭제 중 오류가 발생했습니다.'), 'error');
      }
    });
  };

  const columns: Column<BoardMaster>[] = [
    {
      header: '마스터 아이템',
      accessor: (board: BoardMaster) => (
        <div className="flex items-center group">
          <div className="space-y-1 text-left min-w-0 flex-1 overflow-hidden">
            <p className="text-base font-bold text-foreground tracking-tight leading-none truncate">{board.bbsTtl}</p>
            <p className="text-[10px] font-bold text-muted-foreground/40 uppercase leading-none tracking-widest truncate">{board.bbsId}</p>
          </div>
        </div>
      ),
      className: 'px-6 max-w-[350px]'
    },
    {
      header: '메타 정보',
      accessor: (board: BoardMaster) => (
        <div className="space-y-1.5 text-left min-w-0 max-w-[400px]">
          <p className="text-xs font-bold text-muted-foreground truncate leading-snug">{board.bbsExpln}</p>
          <div className="flex gap-2">
            <Badge variant="secondary" className="bg-muted text-muted-foreground border-none px-2 py-0.5 font-bold text-[10px] uppercase tracking-tighter">
              {board.bbsTypeCdNm}
            </Badge>
          </div>
        </div>
      )
    },
    {
      header: '상태',
      accessor: (board: BoardMaster) => (
        <div className="flex justify-center">
          <Badge className={cn(
            "px-4 py-1.5 rounded-lg font-bold text-xs uppercase border-none tracking-widest shadow-sm",
            board.useYn === 'Y' ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
          )}>
            {board.useYn === 'Y' ? '활성' : '대기'}
          </Badge>
        </div>
      ),
      className: 'text-center'
    },
    // 감사 P1-5: '사용량' 열은 데이터 원천 없이 항상 "0 게시글 수"를 렌더해 모든 게시판이 비어 있는 것처럼
    // 보이게 했다(게시글 수를 주는 API 가 없음). 근거가 생길 때까지 열 자체를 제거한다.
    {
      header: '작업 컨트롤',
      accessor: (board: BoardMaster) => {
        const isDeleting = deletingBoardId === board.bbsId;
        const idleLabel = board.useYn === 'Y'
          ? `${board.bbsTtl} 대기 상태로 비활성화`
          : `${board.bbsTtl} DB에서 영구 물리삭제`;
        const pendingLabel = board.useYn === 'Y'
          ? `${board.bbsTtl} 비활성화 처리 중`
          : `${board.bbsTtl} 영구 삭제 처리 중`;

        return (
        <div className="flex items-center justify-end gap-3 pr-6">
          <Button
            onClick={() => void handleEdit(board)}
            disabled={isDetailLoading || isSaving || deletingBoardId !== null || bulkPendingAction !== null}
            size="icon"
            variant="ghost"
            title={`${board.bbsTtl} 설정 편집`}
            aria-label={`${board.bbsTtl} 설정 편집`}
            className="w-12 h-12 rounded-lg text-muted-foreground hover:bg-primary hover:text-white transition-all shadow-sm"
          >
            <Settings2 size={20} />
          </Button>
          <Button 
            onClick={() => { void handleDelete(board); }}
            disabled={isSaving || deletingBoardId !== null || bulkPendingAction !== null}
            aria-busy={isDeleting}
            size="icon" 
            variant="ghost" 
            className={cn(
              "w-12 h-12 rounded-lg text-muted-foreground transition-all shadow-sm",
              board.useYn === 'Y' 
                ? "hover:bg-amber-500 hover:text-white" 
                : "hover:bg-rose-600 hover:text-white"
            )}
            title={isDeleting ? pendingLabel : idleLabel}
            aria-label={isDeleting ? pendingLabel : idleLabel}
          >
            {isDeleting
              ? <Loader2 size={20} className="animate-spin" aria-hidden="true" />
              : <Trash2 size={20} aria-hidden="true" />}
          </Button>
          <Button
            onClick={() => router.push(`/admin/community/boards/select-board-list?bbsId=${board.bbsId}`)}
            size="icon"
            variant="ghost"
            title={`${board.bbsTtl} 게시글 목록 열기`}
            aria-label={`${board.bbsTtl} 게시글 목록 열기`}
            className="w-12 h-12 rounded-lg text-muted-foreground hover:bg-surface-inverse hover:text-surface-inverse-foreground transition-all shadow-sm"
          >
            <ArrowRight size={20} />
          </Button>
        </div>
        );
      },
      className: 'pr-10 text-right'
    }
  ];

  // 감사 P2: 루트 layout(max-w-7xl p-6/md:p-12/lg:p-16)과 겹치던 화면별 폭/여백(max-w-[1600px] mx-auto px-4) 제거.
  return (
    <WorkListPage
      title="게시판 마스터 콘솔"
      description="생성된 게시판의 사용 여부와 설정을 조회·관리합니다."
      breadcrumbItems={[{ label: '커뮤니티' }, { label: '게시판 관리' }, { label: '마스터 콘솔' }]}
      filterStateKey="community-board-master"
      totalCount={isError ? undefined : totalCount}
      actions={
        /* ⚠ 'ADMIN' 리터럴 하나만 보면 실제 관리자(role=ROLE_ADMIN)에게 진입이 사라진다.
           라우트 게이트와 같은 집합을 쓴다. */
        isAdministrativeRole(user?.role) && (
          <Button size="sm" onClick={() => router.push('/admin/community/boards/maker')} className="gap-2">
            <Plus className="w-4 h-4" aria-hidden="true" />
            생성 마법사
          </Button>
        )
      }
      filter={
        <KeywordFilter
          label="게시판 명칭 · 시스템 ID"
          placeholder="게시판 명칭, 시스템 ID 검색"
          value={searchWrd}
          onSearch={(keyword) => setSearchWrd(keyword)}
        />
      }
      toolbarActions={
        /* 지표 카드 3장(hover ring 30px·아이콘 확대)을 한 줄 요약으로 수렴한다.
           값은 모두 서버 응답에서 파생된다. */
        <span className="text-[length:var(--font-size-body)] text-muted-foreground">
          활성 <span className="font-bold text-foreground">{isLoading ? '—' : activeCount.toLocaleString()}</span>건 ·
          대기 <span className="font-bold text-foreground">{isLoading ? '—' : standbyCount.toLocaleString()}</span>건
        </span>
      }
    >
        <StandardDataTable<BoardMaster>
          columns={columns}
          data={boardList}
          loading={isLoading}
          error={isError ? error : null}
          onRetry={() => refetch()}
          isPremium={true}
          enableSelection={true}
          keyField="bbsId"
          bulkActions={[
            {
              label: '일괄 활성화',
              icon: bulkPendingAction === 'activate'
                ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                : <Zap size={16} aria-hidden="true" />,
              disabled: isSaving || bulkPendingAction !== null || deletingBoardId !== null,
              ariaBusy: bulkPendingAction === 'activate',
              pendingLabel: '활성화 처리 중...',
              onClick: (items) => { void handleBulkStatusChange(items, 'Y', 'activate'); }
            },
            {
              label: '일괄 비활성',
              icon: bulkPendingAction === 'deactivate'
                ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                : <Lock size={16} aria-hidden="true" />,
              disabled: isSaving || bulkPendingAction !== null || deletingBoardId !== null,
              ariaBusy: bulkPendingAction === 'deactivate',
              pendingLabel: '비활성화 처리 중...',
              onClick: (items) => { void handleBulkStatusChange(items, 'N', 'deactivate'); }
            },
            {
              label: '완전 말소',
              icon: bulkPendingAction === 'purge'
                ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                : <Trash2 size={16} aria-hidden="true" />,
              variant: 'destructive',
              disabled: isSaving || bulkPendingAction !== null || deletingBoardId !== null,
              ariaBusy: bulkPendingAction === 'purge',
              pendingLabel: '완전 말소 처리 중...',
              onClick: (items) => { void handleBulkPurge(items); }
            }
          ]}
          accessibleLabel="게시판 마스터 목록"
          emptyMessage={emptyResultMessage(searchWrd, '등록된 게시판이 없습니다.')}
        />

      {/*
        [정직성·G14] 종전 이 자리에는 "Ready to scale your ecosystem?" 5xl 영문 카피와
        400px Rocket 배경이 있었다. 같은 동작(생성 마법사)을 헤더 액션이 이미 제공하므로
        업무 화면에서 마케팅 배너를 제거한다.
      */}
      {/* Settings Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleModalOpenChange}>
        <DialogContent className="sm:max-w-[600px] rounded-lg p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-surface-inverse p-10 text-surface-inverse-foreground relative">
            <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
              <Settings2 size={120} />
            </div>
            <DialogHeader className="relative z-10">
              <DialogTitle className="text-3xl font-bold tracking-tighter uppercase">Board Configuration</DialogTitle>
              <DialogDescription className="text-muted-foreground font-bold uppercase tracking-widest text-xs">
                게시판 마스터 설정 매트릭스
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-10 space-y-8 bg-card transition-colors">
            <FormErrorSummary
              errors={validation.errors}
              labels={boardMasterValidationLabels}
              onNavigate={validation.focusError}
            />
            <div className="space-y-3">
              <Label htmlFor="modal-bbs-name" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">게시판 명칭</Label>
              <Input 
                id="modal-bbs-name"
                {...validation.fieldProps('bbsTtl')}
                value={editData.bbsTtl || ''} 
                onChange={(e) => {
                  validation.clearError('bbsTtl');
                  setEditData({...editData, bbsTtl: e.target.value});
                }}
                required
                maxLength={100}
                className="h-11 rounded-lg border-2 font-bold text-lg focus:ring-4 focus:ring-primary/10 transition-all"
              />
              {validation.errors.bbsTtl ? <p {...validation.messageProps('bbsTtl')} className="text-xs font-bold text-destructive-emphasis" /> : null}
            </div>

            <div className="space-y-3">
              <Label htmlFor="modal-bbs-description" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">게시판 소개</Label>
              <Input 
                id="modal-bbs-description"
                {...validation.fieldProps('bbsExpln')}
                value={editData.bbsExpln || ''} 
                onChange={(e) => {
                  validation.clearError('bbsExpln');
                  setEditData({...editData, bbsExpln: e.target.value});
                }}
                maxLength={4000}
                className="h-11 rounded-lg border-2 font-bold focus:ring-4 focus:ring-primary/10 transition-all"
              />
              {validation.errors.bbsExpln ? <p {...validation.messageProps('bbsExpln')} className="text-xs font-bold text-destructive-emphasis" /> : null}
            </div>

            <div className="flex items-center justify-between p-6 bg-muted rounded-lg border border-border transition-colors">
              <div className="space-y-1">
                <label htmlFor="modal-bbs-use-at" className="font-bold text-foreground transition-colors block cursor-pointer">서비스 활성화 상태</label>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-tighter transition-colors text-left">활성화 시 모든 연결된 메뉴에서 서비스가 재개됩니다.</p>
              </div>
              <Switch 
                id="modal-bbs-use-at"
                {...validation.fieldProps('useYn')}
                aria-required="true"
                checked={editData.useYn === 'Y'} 
                onCheckedChange={(checked) => {
                  validation.clearError('useYn');
                  setEditData({...editData, useYn: checked ? 'Y' : 'N'});
                }}
                className="scale-125"
              />
            </div>
            {validation.errors.useYn ? <p {...validation.messageProps('useYn')} className="text-xs font-bold text-destructive-emphasis" /> : null}

            <div className="p-6 bg-rose-50 dark:bg-rose-950/20 rounded-lg border border-rose-100 dark:border-rose-900/50 flex items-start gap-4 transition-colors">
              <AlertTriangle className="text-rose-500 shrink-0 mt-1" size={20} />
              <div className="space-y-1">
                <p className="font-bold text-rose-900 dark:text-rose-100 text-sm transition-colors text-left">주의사항</p>
                <p className="text-xs text-rose-600/70 dark:text-rose-400 font-medium leading-relaxed transition-colors text-left">
                  게시판을 비활성화(대기)하면 기존 링크를 통한 접근이 차단됩니다. 
                  영구 삭제를 원하시면 목록의 삭제(휴지통) 아이콘을 사용하십시오.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="p-8 bg-muted border-t border-border transition-colors">
            <Button
              type="button"
              variant="ghost"
              disabled={isSaving || deletingBoardId !== null || bulkPendingAction !== null}
              onClick={() => handleModalOpenChange(false)}
              className="h-11 px-8 rounded-lg font-bold"
            >
              취소
            </Button>
            <Button
              disabled={isSaving || deletingBoardId !== null || bulkPendingAction !== null}
              aria-busy={isSaving || undefined}
              onClick={handleSave}
              className="h-11 px-10 rounded-lg bg-primary text-white font-bold tracking-tighter hover:scale-105 transition-all shadow-xl shadow-primary/20"
            >
              {isSaving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              {isSaving ? '저장 중...' : '설정 적용하기'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkListPage>
  );
}
