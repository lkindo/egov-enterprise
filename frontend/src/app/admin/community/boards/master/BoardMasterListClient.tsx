'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Plus,
  Settings2,
  Layers,
  Rocket,
  ArrowRight,
  Zap,
  Trash2,
  AlertTriangle,
  Lock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { boardAdminService, BoardMaster } from '@/services/foundation/system/BoardAdminService';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { PageHeader } from '@/app/components/layout/page-header';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useToast } from '@/app/components/ui/toast';
import { useAuth } from '@/contexts/AuthContext';
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
import { LucideIcon } from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

/**
 * 첨부 파일 허용 용량 기본값(5MB).
 * 백엔드 BoardMasterDto 는 atchPsbltyFileSz 에 @NotNull 을 요구하지만 물리 컬럼은 nullable 이라
 * 레거시 행은 null 일 수 있다. 생성 마법사(BoardMakerWizard)와 동일한 기본값으로 보정한다.
 */
const DEFAULT_ATCH_PSBLTY_FILE_SZ = 5242880;

interface InsightCardProps {
  label: string;
  value: string;
  desc: string;
  icon: LucideIcon;
  color: string;
}

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
    if (!board.bbsId) return;
    setIsDetailLoading(true);
    try {
      const detail = await boardAdminService.getBoardMaster(board.bbsId);
      setSelectedBoard(detail);
      setEditData({ ...detail });
    } catch (err: any) {
      // 상세 조회 실패 시에도 편집은 가능하게 하되, 목록 값만으로는 필수 필드가 부족할 수 있음을 알린다.
      setSelectedBoard(board);
      setEditData({ ...board });
      toast(err?.message || '게시판 상세 정보를 불러오지 못했습니다. 일부 설정이 누락된 상태로 표시됩니다.', 'error');
    } finally {
      setIsDetailLoading(false);
      setIsModalOpen(true);
    }
  };

  const handleSave = async () => {
    if (!selectedBoard || !selectedBoard.bbsId) return;

    // 백엔드 BoardMasterDto 는 bbsTypeCd/bbsAtrbCd(@NotBlank), atchPsbltyFileSz(@NotNull), useYn(@NotBlank) 을
    // 모두 요구한다. 모달이 편집하는 3개 필드만 보내면 @Valid 단계에서 항상 400 이 떨어지므로 기존 값을 병합한다.
    // 단, spring.jackson `fail-on-unknown-properties: true` 이고 crtDt/mdfcnDt 는 LocalDateTime 이므로
    // 응답 객체를 통째로 되돌려보내지 않고 서버가 실제로 사용하는 필드만 명시적으로 조립한다.
    const merged = { ...selectedBoard, ...editData };
    const payload: Partial<BoardMaster> = {
      bbsId: selectedBoard.bbsId,
      bbsTtl: merged.bbsTtl,
      bbsExpln: merged.bbsExpln,
      bbsTypeCd: merged.bbsTypeCd,
      bbsAtrbCd: merged.bbsAtrbCd,
      ansPsbltyYn: merged.ansPsbltyYn,
      fileAtchPsbltyYn: merged.fileAtchPsbltyYn,
      atchPsbltyFileQty: merged.atchPsbltyFileQty,
      atchPsbltyFileSz: merged.atchPsbltyFileSz ?? DEFAULT_ATCH_PSBLTY_FILE_SZ,
      tmpltId: merged.tmpltId,
      useYn: merged.useYn,
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

    try {
      await boardAdminService.updateBoardMaster(selectedBoard.bbsId, payload);
      toast('게시판 설정이 업데이트되었습니다.', 'success');
      setIsModalOpen(false);
      refetch();
    } catch (err: any) {
      // client.ts 인터셉터가 백엔드 message 를 Error.message 로 승격하므로 그대로 노출해 원인이 보이게 한다.
      toast(err?.message || '업데이트 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDelete = async (board: BoardMaster) => {
    if (!board.bbsId) return;

    if (board.useYn === 'Y') {
      // 1. 활성 상태인 경우 -> Soft Delete (대기 상태 전환)
      const isConfirmed = await confirm({
        title: '게시판 서비스 비활성화',
        message: `[${board.bbsTtl}] 게시판을 대기 상태로 전환(비활성화)하시겠습니까?`,
        confirmText: '비활성화',
        variant: 'destructive'
      });

      if (isConfirmed) {
        try {
          await boardAdminService.deleteBoardMaster(board.bbsId, 'admin');
          toast('게시판이 비활성화(대기) 상태로 전환되었습니다.', 'success');
          refetch();
        } catch {
          toast('비활성화 처리 중 오류가 발생했습니다.', 'error');
        }
      }
    } else {
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
      } catch (error: any) {
        const errMsg = error.message || '영구 삭제 처리 중 오류가 발생했습니다.';
        toast(errMsg, 'error');
      }
    }
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
      accessor: (board: BoardMaster) => (
        <div className="flex items-center justify-end gap-3 pr-6">
          <Button
            onClick={() => void handleEdit(board)}
            disabled={isDetailLoading}
            size="icon"
            variant="ghost"
            title={`${board.bbsTtl} 설정 편집`}
            aria-label={`${board.bbsTtl} 설정 편집`}
            className="w-12 h-12 rounded-lg text-muted-foreground hover:bg-primary hover:text-white transition-all shadow-sm"
          >
            <Settings2 size={20} />
          </Button>
          <Button 
            onClick={() => handleDelete(board)}
            size="icon" 
            variant="ghost" 
            className={cn(
              "w-12 h-12 rounded-lg text-muted-foreground transition-all shadow-sm",
              board.useYn === 'Y' 
                ? "hover:bg-amber-500 hover:text-white" 
                : "hover:bg-rose-600 hover:text-white"
            )}
            title={board.useYn === 'Y' ? `${board.bbsTtl} 대기 상태로 비활성화` : `${board.bbsTtl} DB에서 영구 물리삭제`}
            aria-label={board.useYn === 'Y' ? `${board.bbsTtl} 대기 상태로 비활성화` : `${board.bbsTtl} DB에서 영구 물리삭제`}
          >
            <Trash2 size={20} />
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
      ),
      className: 'pr-10 text-right'
    }
  ];

  // 감사 P2: 루트 layout(max-w-7xl p-6/md:p-12/lg:p-16)과 겹치던 화면별 폭/여백(max-w-[1600px] mx-auto px-4) 제거.
  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader 
        title="게시판 마스터" 
        breadcrumbs={[{ label: '커뮤니티' }, { label: '게시판 관리' }, { label: '마스터 콘솔' }]} 
      />

      <HubHeader 
        title="마스터 콘솔" 
        highlight="게시판 통합 관리" 
        subtitle="생성된 모든 게시판의 라이프사이클과 권한 매트릭스를 실시간으로 제어하고 모니터링합니다" 
        icon={Settings2} 
        actions={
          user?.role === 'ADMIN' && (
            <Button 
              onClick={() => router.push('/admin/community/boards/maker')}
              className="h-11 px-10 rounded-lg bg-slate-900 dark:bg-primary border-none text-white font-bold text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all gap-4 ring-8 ring-slate-900/5 dark:ring-primary/5 group"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              생성 마법사
              <Rocket className="w-4 h-4 text-primary dark:text-white opacity-40 group-hover:text-primary group-hover:opacity-100 transition-all" />
            </Button>
          )
        }
      />

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-8"
      >
        <InsightCard label="전체 게시판" value={isLoading ? '—' : totalCount.toLocaleString()} desc="등록된 게시판 마스터 수" icon={Layers} color="text-hub-indigo" />
        <InsightCard label="활성" value={isLoading ? '—' : activeCount.toLocaleString()} desc="사용 여부 Y (서비스 중)" icon={Zap} color="text-emerald-500" />
        <InsightCard label="대기" value={isLoading ? '—' : standbyCount.toLocaleString()} desc="사용 여부 N (비활성)" icon={Lock} color="text-amber-500" />
      </motion.div>

      <div className="hub-table-container">
        <StandardDataTable<BoardMaster>
          columns={columns}
          data={boardList}
          loading={isLoading}
          error={isError ? error : null}
          onRetry={() => refetch()}
          isPremium={true}
          enableSelection={true}
          bulkActions={[
            {
              label: '일괄 활성화',
              icon: <Zap size={16} />,
              onClick: async (items) => {
                const ids = items.map(item => item.bbsId).filter(Boolean) as string[];
                if (ids.length === 0) return;
                try {
                  await boardAdminService.batchUpdateBoardMasterStatus(ids, 'Y');
                  toast(`${items.length}개의 게시판이 일괄 활성화되었습니다.`, 'success');
                  refetch();
                } catch (err: any) {
                  toast(err.message || '일괄 활성화 중 오류가 발생했습니다.', 'error');
                }
              }
            },
            {
              label: '일괄 비활성',
              icon: <Lock size={16} />,
              onClick: async (items) => {
                const ids = items.map(item => item.bbsId).filter(Boolean) as string[];
                if (ids.length === 0) return;
                try {
                  await boardAdminService.batchUpdateBoardMasterStatus(ids, 'N');
                  toast(`${items.length}개의 게시판이 일괄 비활성화되었습니다.`, 'info');
                  refetch();
                } catch (err: any) {
                  toast(err.message || '일괄 비활성화 중 오류가 발생했습니다.', 'error');
                }
              }
            },
            {
              label: '완전 말소',
              icon: <Trash2 size={16} />,
              variant: 'destructive',
              onClick: async (items) => {
                const ids = items.map(item => item.bbsId).filter(Boolean) as string[];
                if (ids.length === 0) return;

                // 1. 활성 상태인 게시판 필터링
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

                // 2. 최종 물리 삭제 컨펌
                const isConfirmed = await confirm({
                  title: '선택한 게시판 일괄 영구 말소',
                  message: `선택하신 ${items.length}개의 게시판과 모든 관련 설정을 데이터베이스에서 완전히 영구 말소하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
                  confirmText: '일괄 영구 삭제',
                  variant: 'destructive'
                });

                if (isConfirmed) {
                  try {
                    await boardAdminService.batchDeleteBoardMastersPhysically(ids);
                    toast('선택한 게시판 마스터 데이터가 모두 영구 말소되었습니다.', 'success');
                    refetch();
                  } catch (err: any) {
                    toast(err.message || '일괄 영구 삭제 중 오류가 발생했습니다.', 'error');
                  }
                }
              }
            }
          ]}
          search={{
            placeholder: '게시판 명칭, 시스템 ID 검색..',
            onSearch: (keyword) => setSearchWrd(keyword)
          }}
        />
      </div>

      <div className="p-12 rounded-lg bg-muted border border-border dark:border-none text-foreground overflow-hidden relative group transition-colors">
        <div className="absolute top-0 right-0 p-20 opacity-[0.03] dark:opacity-[0.05] group-hover:scale-110 transition-transform duration-[10s] pointer-events-none grayscale">
          <Rocket size={400} />
        </div>
        <div className="max-w-3xl space-y-8 relative z-10">
          <h3 className="text-5xl font-bold tracking-tighter leading-tight uppercase transition-colors">Ready to scale your <span className="text-primary underline decoration-primary/30 decoration-8 underline-offset-8">ecosystem?</span></h3>
          <p className="text-xl text-muted-foreground dark:text-muted-foreground font-bold leading-relaxed tracking-tight transition-colors">생태계를 확장할 준비가 되셨습니까? 마법사를 통해 복잡한 과정 없이 단 4단계만으로 사내 지식 허브를 구축하십시오.</p>
          <Button 
            onClick={() => router.push('/admin/community/boards/maker')}
            className="h-11 px-12 rounded-lg bg-primary text-white text-2xl font-bold tracking-tighter shadow-[0_30px_60px_-15px_rgba(59,130,246,0.4)] hover:scale-110 active:scale-95 transition-all gap-4 ring-8 ring-primary/5 "
          >
            라이브 마법사 실행 <Rocket className="w-8 h-8" />
          </Button>
        </div>
      </div>

      {/* Settings Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
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
            <div className="space-y-3">
              <Label htmlFor="modal-bbs-name" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">게시판 명칭</Label>
              <Input 
                id="modal-bbs-name"
                value={editData.bbsTtl || ''} 
                onChange={(e) => setEditData({...editData, bbsTtl: e.target.value})}
                className="h-11 rounded-lg border-2 font-bold text-lg focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="modal-bbs-description" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">게시판 소개</Label>
              <Input 
                id="modal-bbs-description"
                value={editData.bbsExpln || ''} 
                onChange={(e) => setEditData({...editData, bbsExpln: e.target.value})}
                className="h-11 rounded-lg border-2 font-bold focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>

            <div className="flex items-center justify-between p-6 bg-muted rounded-lg border border-border transition-colors">
              <div className="space-y-1">
                <label htmlFor="modal-bbs-use-at" className="font-bold text-foreground transition-colors block cursor-pointer">서비스 활성화 상태</label>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-tighter transition-colors text-left">활성화 시 모든 연결된 메뉴에서 서비스가 재개됩니다.</p>
              </div>
              <Switch 
                id="modal-bbs-use-at"
                checked={editData.useYn === 'Y'} 
                onCheckedChange={(checked) => setEditData({...editData, useYn: checked ? 'Y' : 'N'})}
                className="scale-125"
              />
            </div>

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
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="h-11 px-8 rounded-lg font-bold">취소</Button>
            <Button onClick={handleSave} className="h-11 px-10 rounded-lg bg-primary text-white font-bold tracking-tighter hover:scale-105 transition-all shadow-xl shadow-primary/20">설정 적용하기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InsightCard({ label, value, desc, icon: Icon, color }: InsightCardProps) {
  return (
    <motion.div variants={item} className="hub-card-premium p-8 space-y-6 group hover:ring-[30px] hover:ring-border/30 transition-all border-2 border-border/50">
      <div className="flex items-center justify-between">
        <div className={cn("w-14 h-11 rounded-lg bg-muted flex items-center justify-center border border-border group-hover:scale-110 transition-transform text-muted-foreground", color)}>
          <Icon size={28} aria-hidden="true" />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-bold text-muted-foreground tracking-widest leading-none text-left">{label}</p>
        <h4 className="text-4xl font-bold text-foreground tracking-tighter leading-none group-hover:text-primary transition-colors text-left">{value}</h4>
        <p className="text-xs font-bold text-muted-foreground/60 leading-none mt-2 text-left">{desc}</p>
      </div>
    </motion.div>
  );
}
