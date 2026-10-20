import { fetchAllPages } from '@/lib/api/fetch-all-pages';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  MeasuringStrategy,
  type Announcements
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import {
  buildInitialCodeClusters,
  findGroupInClusters,
  flattenCodeTree,
  FlattenedCodeNode,
  moveGroupNodeToCluster,
} from './treeUtils';
import {
  Search,
  SearchSlash,
  Plus,
  Settings,
  Trash2,
  Save,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppForm } from '@/hooks/useAppForm';
import { Form, FormErrorSummary } from '@/components/ui/form';
import { Column } from '@/app/components/ui/standard-data-table';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { CodePicker, CodePickerSelection } from '@/app/components/ui/code-picker';
import { codeAdminService } from '@/services/foundation/system/CodeAdminService';
import { z } from 'zod';
import {
  saveCodeDetail,
  deleteCodeDetail,
  saveCmmnCodeHierarchyAction,
  saveClCodeAction,
  saveCmmnCodeAction
} from '@/app/actions/codeActions';
import {
  CmmnClCode,
  CmmnCode,
  CmmnDetailCode
} from '@/types/foundation/system';
import { GroupCode } from '@/types/foundation/code';
import { MasterDetailPage } from '@/app/components/patterns/master-detail-page';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';

import {
  codeClusterFormSchema,
  codeDetailFormSchema,
  codeGroupFormSchema,
  CODE_CLUSTER_FIELD_LABELS,
  CODE_DETAIL_FIELD_LABELS,
  CODE_GROUP_FIELD_LABELS,
} from './common-code-form-schemas';
import {
  buildCodeDndAnnouncements,
  CODE_DND_SCREEN_READER_INSTRUCTIONS,
  CodeNodeOverlay,
  COMMON_DETAIL_COLUMNS,
  CommonCodeDetailActions,
  CommonCodeDetailPanel,
  dropAnimation,
  filterCodeNodes,
  SortableCodeNode,
} from './CodeTreeNode';
import { CodeClusterFields, CodeDetailFields, CodeGroupFields } from './CodeFormFields';
import { CommonCodeChangeHistoryDialog, type CodeChangeHistoryTarget } from './CommonCodeChangeHistoryDialog';
import { CODE_USAGE_DETAILS_LABEL, CodeUsageList, codeGroupLabel, codeUsagesOf } from './code-usage';

/** 새 상세 코드 폼의 기본값 — 폼 생성과 등록 모달 열기가 같은 값을 쓴다. */
const DETAIL_FORM_DEFAULTS: z.infer<typeof codeDetailFormSchema> = {
  dtlCd: '',
  dtlCdNm: '',
  useYn: 'Y',
  dtlCdExpln: ''
};
/** 새 코드 분류 폼의 기본값 — 폼 생성과 분류 등록 열기가 같은 값을 쓴다. */
const CLUSTER_FORM_DEFAULTS: z.infer<typeof codeClusterFormSchema> = { clsfCd: '', clsfCdNm: '', clsfCdExpln: '', useYn: 'Y' };

interface CommonCodeClientProps {
  clCodes: CmmnClCode[];
  groups: CmmnCode[];
  details: CmmnDetailCode[];
  selectedGroupId?: string | null;
  notice?: React.ReactNode;
  loadFailed?: boolean;
  embedded?: boolean;
}

export default function CommonCodeClient({
  clCodes,
  groups,
  details,
  selectedGroupId,
  notice,
  loadFailed = false,
  embedded = false,
}: CommonCodeClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  // [2026-10-01] 쓰기 버튼은 그 동작의 기능 권한으로 보인다 — 조회 권한(CODE_READ)만으로 들어와 폼을 채운 뒤에야 403 을 만나지 않게 한다(표시 판정일 뿐 서버 인가는 그대로다). 그룹 소속 저장은 CODE_UPDATE 다.
  const { user } = useAuth();
  const canCreateCode = canPermission(user, 'CODE_CREATE');
  const canUpdateCode = canPermission(user, 'CODE_UPDATE');
  const canDeleteCode = canPermission(user, 'CODE_DELETE');

  // --- State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isModalOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const hierarchySavePendingRef = useRef(false);
  const detailSubmitAttemptRef = useRef(false);
  const detailSavePendingRef = useRef(false);
  const detailDeletePendingRef = useRef(false);
  const [isDetailSaving, setIsDetailSaving] = useState(false);
  const [deletingDetailKey, setDeletingDetailKey] = useState<string | null>(null);
  const [editingDetail, setEditingDetail] = useState<CmmnDetailCode | null>(null);
  const [modalTargetGroup, setModalTargetGroup] = useState<Pick<GroupCode, 'cdId' | 'cdIdNm'> | null>(null);

  /**
   * 구조(분류·그룹) 편집 모달 상태.
   *
   * 종전에는 상세 코드만 등록·수정할 수 있었고 그 상위인 분류·그룹은 화면에서 만들 수도 고칠 수도
   * 없었다 — 서버와 프런트 서비스에는 CRUD 6종이 전부 살아 있는데 배선만 없었다. 그래서 새 코드
   * 체계를 도입하려면 DB 를 직접 건드려야 했다.
   */
  /*
    [2026-10-18] version 은 수정 창을 열 때 읽은 낙관적 잠금 버전이다. 저장은 이 값을 보내고, 그 사이 다른 사람이 고쳤으면
    서버가 409 로 거부해 덮어쓰지 않는다. 창이 열린 동안 목록이 다시 읽혀도 바꾸지 않는다 — 최신으로 고치려면 다시 연다.
  */
  const [structureModal, setStructureModal] = useState<
    { kind: 'cluster' | 'group'; mode: 'create' | 'edit'; version?: number } | null
  >(null);
  const [isStructureSaving, setIsStructureSaving] = useState(false);
  const structureSubmitAttemptRef = useRef(false);
  const structureSavePendingRef = useRef(false);

  // D&D States
  const [flattenedNodes, setFlattenedNodes] = useState<FlattenedCodeNode[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hasExplorerChanges, setHasExplorerChanges] = useState(false);
  const hierarchyRevisionRef = useRef(0);

  const form = useAppForm<
    typeof codeDetailFormSchema,
    z.infer<typeof codeDetailFormSchema>
  >(codeDetailFormSchema, {
    defaultValues: DETAIL_FORM_DEFAULTS
  });
  const resetForm = form.reset;
  const isDetailFormPending = isDetailSaving || form.formState.isSubmitting;
  const isDetailWritePending = isDetailFormPending || deletingDetailKey !== null;

  // 구조(분류·그룹) 폼. 두 종류가 필드 집합이 다르므로 폼을 각각 둔다.
  const clusterForm = useAppForm<
    typeof codeClusterFormSchema,
    z.infer<typeof codeClusterFormSchema>
  >(codeClusterFormSchema, {
    defaultValues: CLUSTER_FORM_DEFAULTS
  });
  const groupForm = useAppForm<
    typeof codeGroupFormSchema,
    z.infer<typeof codeGroupFormSchema>
  >(codeGroupFormSchema, {
    defaultValues: { cdId: '', cdIdNm: '', cdIdExpln: '', clsfCd: '', useYn: 'Y' }
  });
  const isStructureFormPending = isStructureSaving
    || clusterForm.formState.isSubmitting
    || groupForm.formState.isSubmitting;

  useEffect(() => {
    if (isModalOpen) {
      if (editingDetail) {
        resetForm({
          dtlCd: editingDetail.dtlCd,
          dtlCdNm: editingDetail.dtlCdNm,
          useYn: (editingDetail.useYn as 'Y' | 'N') || 'Y',
          dtlCdExpln: editingDetail.dtlCdExpln || ''
        });
      } else {
        resetForm(DETAIL_FORM_DEFAULTS);
      }
    }
  }, [editingDetail, isModalOpen, resetForm]);

  const initialClusters = useMemo(
    () => buildInitialCodeClusters(clCodes, groups),
    [clCodes, groups],
  );

  const hierarchySignature = useMemo(
    () => JSON.stringify(initialClusters),
    [initialClusters],
  );
  const hierarchySeedSignatureRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const previousSignature = hierarchySeedSignatureRef.current;
    if (previousSignature === hierarchySignature) return;
    hierarchySeedSignatureRef.current = hierarchySignature;
    setFlattenedNodes(flattenCodeTree(initialClusters));
    if (previousSignature !== undefined && hasExplorerChanges) {
      hierarchyRevisionRef.current += 1;
      setHasExplorerChanges(false);
      setActiveId(null);
      toast('서버의 코드 구조가 갱신되어 저장되지 않은 소속 분류 변경을 취소했습니다.', 'info');
    }
  }, [hasExplorerChanges, hierarchySignature, initialClusters, toast]);

  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupCode | null>(null);
  // [2026-09-27 DIP B5 F11] 변경 이력 대화상자 — 열릴 때만 마운트한다.
  const [historyTarget, setHistoryTarget] = useState<CodeChangeHistoryTarget | null>(null);
  const previousSelectedGroupIdRef = useRef<string | null | undefined>(undefined);
  const selectedGroupSeedResolvedRef = useRef(false);
  const selectedGroupSeedHierarchyRef = useRef<string | undefined>(undefined);

  const selectNode = (node: FlattenedCodeNode) => {
    if (node.type === 'cluster') {
      setSelectedClusterId(node.id);
      setSelectedGroup(null);
      return;
    }
    setSelectedClusterId(node.parentId);
    setSelectedGroup(node.data);
  };

  const selectedNodeId = selectedGroup?.cdId ?? selectedClusterId;
  const selectedNode = selectedNodeId
    ? flattenedNodes.find((node) => node.id === selectedNodeId) ?? null
    : null;

  /*
   * [P1-1] 상세코드 조회를 useQuery 로 옮긴다.
   * 종전에는 catch→toast 후 직전 목록이 그대로 남아 "조회 성공"처럼 보였고 재시도 수단이 없었다.
   * 이제 실패는 StandardDataTable 의 error/onRetry 로 화면에 드러난다.
   */
  const selectedCdId = selectedGroup?.cdId ?? null;
  const {
    data: detailRows,
    isFetching: detailsLoading,
    error: detailsError,
    refetch: refetchDetails,
  } = useQuery({
    queryKey: ['cmmn-detail-codes', selectedCdId],
    enabled: !!selectedCdId,
    queryFn: async () => {
      const rows = await fetchAllPages((page, size) =>
        codeAdminService.getDetailCodeList({
          searchKeyword: selectedCdId as string,
          searchCondition: '1',
          page,
          size,
        }));
      // 페일세이프: contains 검색 결과를 선택한 그룹과 정확히 일치하도록 한 번 더 거른다.
      return rows.filter(item => item && item.cdId === selectedCdId);
    },
    /*
     * SSR 로 이미 받아 둔 상세 목록만 자리표시자로 재사용한다.
     * 직전 그룹의 데이터(prev)를 넘기면 다른 그룹의 코드가 잠깐 노출되므로 쓰지 않는다.
     */
    placeholderData: selectedCdId && selectedCdId === selectedGroupId
      ? details.filter((item): item is CmmnDetailCode => Boolean(item) && item.cdId === selectedCdId)
      : undefined,
  });

  const detailList: CmmnDetailCode[] = detailRows ?? [];

  // D&D Handlers
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const dndAnnouncements = useMemo<Announcements>(
    () => buildCodeDndAnnouncements(flattenedNodes),
    [flattenedNodes],
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (searchQuery || isSaving) return;
    const nextActiveId = event.active.id as string;
    const activeNode = flattenedNodes.find((node) => node.id === nextActiveId);
    if (!activeNode || activeNode.type !== 'group') return;
    setActiveId(nextActiveId);
    selectNode(activeNode);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (searchQuery || isSaving) {
      setActiveId(null);
      return;
    }
    const { active, over } = event;
    const outcome = moveGroupNodeToCluster(flattenedNodes, active.id, over?.id);
    if (outcome.kind === 'same-cluster') {
      toast('같은 분류 안의 순서는 저장되지 않습니다. 다른 분류로 이동해 주세요.', 'info');
      setActiveId(null);
      return;
    }
    if (outcome.kind !== 'moved') {
      setActiveId(null);
      return;
    }

    setFlattenedNodes(outcome.nextNodes);
    setSelectedClusterId(outcome.targetParentId);
    hierarchyRevisionRef.current += 1;
    setHasExplorerChanges(true);
    toast('코드 그룹의 소속 분류가 변경되었습니다.', 'info');
    setActiveId(null);
  };

  /** 선택된 분류에 속한 코드 그룹 수. 미사용 전환 고지와 분류 상세의 '포함 그룹' 수에 쓴다. */
  const groupCountOf = (clsfCd: string) =>
    flattenedNodes.filter((node) => node.type === 'group' && node.parentId === clsfCd).length;

  const openCreateCluster = () => {
    clusterForm.reset(CLUSTER_FORM_DEFAULTS);
    setStructureModal({ kind: 'cluster', mode: 'create' });
  };

  const openEditCluster = () => {
    if (selectedNode?.type !== 'cluster') return;
    const source = clCodes.find((cl) => cl.clsfCd === selectedNode.id);
    clusterForm.reset({
      clsfCd: selectedNode.id,
      clsfCdNm: source?.clsfCdNm ?? selectedNode.name,
      clsfCdExpln: source?.clsfCdExpln ?? '',
      useYn: (source?.useYn as 'Y' | 'N') ?? 'Y',
    });
    setStructureModal({ kind: 'cluster', mode: 'edit', version: source?.version });
  };

  /** 새 그룹은 반드시 분류에 속한다 — 서버가 clsfCd 를 필수로 요구한다. */
  const openCreateGroup = () => {
    const defaultCluster = selectedNode?.type === 'cluster'
      ? selectedNode.id
      : selectedNode?.type === 'group'
        ? selectedNode.parentId ?? ''
        : clCodes[0]?.clsfCd ?? '';
    groupForm.reset({ cdId: '', cdIdNm: '', cdIdExpln: '', clsfCd: defaultCluster, useYn: 'Y' });
    setStructureModal({ kind: 'group', mode: 'create' });
  };

  const openEditGroup = () => {
    if (selectedNode?.type !== 'group') return;
    const source = groups.find((g) => g.cdId === selectedNode.id);
    groupForm.reset({
      cdId: selectedNode.id,
      cdIdNm: source?.cdIdNm ?? selectedNode.name,
      cdIdExpln: source?.cdIdExpln ?? '',
      clsfCd: selectedNode.parentId ?? source?.clsfCd ?? '',
      useYn: (source?.useYn as 'Y' | 'N') ?? 'Y',
    });
    setStructureModal({ kind: 'group', mode: 'edit', version: source?.version });
  };

  const closeStructureModal = () => {
    if (structureSubmitAttemptRef.current || structureSavePendingRef.current) return;
    setStructureModal(null);
  };

  const onSubmitCluster = async (values: z.infer<typeof codeClusterFormSchema>) => {
    if (structureSavePendingRef.current) return;
    const isNew = structureModal?.mode === 'create';

    /*
     * 분류를 미사용으로 바꾸면 **소속 코드 그룹이 전부 목록에서 사라진다** —
     * 코드그룹 조회가 commonCodeCategory.useYn.eq("Y") 로 조인 필터를 걸기 때문이다
     * (CommonCodeGroupRepositoryImpl). 되돌릴 수는 있지만 사용자에게는 데이터가 없어진 것처럼
     * 보이므로, 저장 전에 결과를 그대로 말한다.
     */
    if (!isNew && values.useYn === 'N') {
      const affected = groupCountOf(values.clsfCd);
      if (affected > 0) {
        // [2026-10-20] 사라질 그룹 가운데 이 제품이 읽는 그룹이 있으면 그 사용처를 함께 보인다.
        const readGroups = flattenedNodes.filter((node): node is Extract<FlattenedCodeNode, { type: 'group' }> =>
          node.type === 'group' && node.parentId === values.clsfCd && codeUsagesOf(node.data).length > 0);
        const ok = await confirm({
          title: '분류를 미사용으로 전환',
          message: '이 분류를 미사용으로 바꾸면 소속 코드 그룹 ' + affected + '개가 목록에서 함께 사라집니다. 그룹과 상세 코드가 지워지는 것은 아니며, 분류를 다시 사용으로 되돌리면 그대로 나타납니다.'
            + (readGroups.length > 0 ? ' 이 가운데 ' + readGroups.length + '개는 이 제품이 읽는 그룹이라 아래 사용처를 확인하세요.' : ''),
          confirmText: '미사용으로 전환',
          ...(readGroups.length > 0 ? {
            detailsLabel: CODE_USAGE_DETAILS_LABEL,
            details: (
              <div className="space-y-3">
                {readGroups.map((node) => (
                  <div key={node.id} className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{codeGroupLabel(node.data)}</p>
                    <CodeUsageList usages={codeUsagesOf(node.data)} />
                  </div>
                ))}
              </div>
            ),
          } : {}),
        });
        // 확인을 취소하면 제출 시도 잠금을 푼다 — 남겨 두면 창을 닫을 수도 다시 저장할 수도 없다.
        if (!ok) { structureSubmitAttemptRef.current = false; return; }
      }
    }

    structureSavePendingRef.current = true;
    setIsStructureSaving(true);
    try {
      const res = await saveClCodeAction(null, { ...values, isNew, version: isNew ? undefined : structureModal?.version });
      if (res.success) {
        toast(res.message, 'success');
        setStructureModal(null);
        router.refresh();
      } else {
        // 다른 사람이 먼저 고쳤다(409) — 서버 사유를 보이고 목록을 다시 읽는다. 입력한 내용은 창에 남긴다.
        if (res.conflict) router.refresh();
        if (!clusterForm.applyServerErrors(res)) toast(res.message, 'error');
      }
    } catch (error) {
      if (!clusterForm.applyServerErrors(error)) {
        toast('서버 통신 중 오류가 발생했습니다. 입력 내용은 유지되므로 잠시 후 다시 시도해 주세요.', 'error');
      }
    } finally {
      structureSavePendingRef.current = false;
      structureSubmitAttemptRef.current = false;
      setIsStructureSaving(false);
    }
  };

  const onSubmitGroup = async (values: z.infer<typeof codeGroupFormSchema>) => {
    if (structureSavePendingRef.current) return;
    const isNew = structureModal?.mode === 'create';

    /*
     * [2026-10-20] 이 제품이 읽는 그룹을 사용 안 함으로 바꾸기 전에 사용처를 보인다. 상세 코드 목록은 '사용' 그룹의 상세 코드만
     * 보이므로(CommonCodeRepositoryImpl) 바꾼 뒤에는 이 화면에서 그 상세 코드를 볼 수 없다는 점도 말한다.
     */
    const source = isNew ? undefined : groups.find((group) => group.cdId === values.cdId);
    const usages = codeUsagesOf(source);
    if (!isNew && source && source.useYn !== 'N' && values.useYn === 'N' && usages.length > 0) {
      const ok = await confirm({
        title: '이 제품이 읽는 그룹을 사용 안 함으로 전환',
        message: `${codeGroupLabel(source)} 그룹은 이 제품이 읽는 그룹입니다. 사용 안 함으로 바꾸면 이 화면의 상세 코드 목록에 그 상세 코드가 보이지 않습니다. 아래 사용처를 확인한 뒤 진행하세요.`,
        details: <CodeUsageList usages={usages} />,
        detailsLabel: CODE_USAGE_DETAILS_LABEL,
        confirmText: '사용 안 함으로 전환',
      });
      if (!ok) { structureSubmitAttemptRef.current = false; return; }
    }

    structureSavePendingRef.current = true;
    setIsStructureSaving(true);
    try {
      const res = await saveCmmnCodeAction(null, { ...values, isNew, version: isNew ? undefined : structureModal?.version });
      if (res.success) {
        toast(res.message, 'success');
        setStructureModal(null);
        router.refresh();
      } else {
        // 다른 사람이 먼저 고쳤다(409) — 서버 사유를 보이고 목록을 다시 읽는다. 입력한 내용은 창에 남긴다.
        if (res.conflict) router.refresh();
        if (!groupForm.applyServerErrors(res)) toast(res.message, 'error');
      }
    } catch (error) {
      if (!groupForm.applyServerErrors(error)) {
        toast('서버 통신 중 오류가 발생했습니다. 입력 내용은 유지되므로 잠시 후 다시 시도해 주세요.', 'error');
      }
    } finally {
      structureSavePendingRef.current = false;
      structureSubmitAttemptRef.current = false;
      setIsStructureSaving(false);
    }
  };

  const submitStructureForm = (event?: React.BaseSyntheticEvent) => {
    if (structureSubmitAttemptRef.current || structureSavePendingRef.current) {
      event?.preventDefault();
      return;
    }
    structureSubmitAttemptRef.current = true;
    const handler = structureModal?.kind === 'cluster'
      ? clusterForm.handleSubmit(onSubmitCluster, () => { structureSubmitAttemptRef.current = false; })
      : groupForm.handleSubmit(onSubmitGroup, () => { structureSubmitAttemptRef.current = false; });
    void handler(event).catch(() => {
      structureSubmitAttemptRef.current = false;
      structureSavePendingRef.current = false;
      setIsStructureSaving(false);
    });
  };

  const handleSaveExplorerChanges = async () => {
    if (hierarchySavePendingRef.current || !hasExplorerChanges || !selectedNode || isSaving || isModalOpen || isPickerOpen) return;
    hierarchySavePendingRef.current = true;
    const savingRevision = hierarchyRevisionRef.current;
    setIsSaving(true);
    try {
      const res = await saveCmmnCodeHierarchyAction(flattenedNodes);
      if (res.success) {
        toast(res.message, 'success');
        if (hierarchyRevisionRef.current === savingRevision) {
          setHasExplorerChanges(false);
          router.refresh();
        } else {
          toast('저장 중 추가된 소속 분류 변경이 남아 있습니다. 다시 저장해 주세요.', 'info');
        }
      } else {
        toast(res.message, 'error');
      }
    } catch {
      toast('그룹 소속 저장 중 오류 발생', 'error');
    } finally {
      hierarchySavePendingRef.current = false;
      setIsSaving(false);
    }
  };

  /**
   * CodePicker 1호 소비처 — 팝업에서 고른 코드의 그룹을 탐색기에서 그대로 선택한다.
   * (상세 목록은 기존 useQuery 경로가 이어받는다. 신규 조회 경로를 만들지 않는다.)
   */
  const handlePickCode = ({ group, code }: CodePickerSelection) => {
    const found = findGroupInClusters(initialClusters, group.cdId);
    if (!found) {
      toast('선택한 코드 그룹을 현재 탐색기에서 찾을 수 없습니다. 데이터를 새로고침한 뒤 다시 시도해 주세요.', 'error');
      return;
    }
    setSearchQuery('');
    setSelectedClusterId(found.cluster.id);
    setSelectedGroup(found.group);
    toast(`‘${code.dtlCdNm}’(${code.dtlCd}) — ${group.cdIdNm} 그룹이 선택되었습니다.`, 'success');
  };

  // Synchronize initial state from props
  useEffect(() => {
    const nextSelectedGroupId = selectedGroupId ?? null;
    const previousSelectedGroupId = previousSelectedGroupIdRef.current;
    const seedChanged = previousSelectedGroupId !== nextSelectedGroupId;
    const hierarchyChanged = selectedGroupSeedHierarchyRef.current !== hierarchySignature;
    if (!seedChanged && !hierarchyChanged) return;
    previousSelectedGroupIdRef.current = nextSelectedGroupId;
    selectedGroupSeedHierarchyRef.current = hierarchySignature;

    const findGroup = (groupId: string) => findGroupInClusters(initialClusters, groupId);
    const revealSelectionIfHidden = (nodeId: string) => {
      if (!searchQuery) return;
      const nextVisibleNodes = filterCodeNodes(flattenCodeTree(initialClusters), searchQuery);
      if (!nextVisibleNodes.some((node) => node.id === nodeId)) setSearchQuery('');
    };

    if (!seedChanged) {
      if (selectedGroup) {
        const currentSelection = findGroup(selectedGroup.cdId);
        if (currentSelection) {
          revealSelectionIfHidden(currentSelection.group.cdId);
          setSelectedClusterId(currentSelection.cluster.id);
          setSelectedGroup(currentSelection.group);
          return;
        }
        if (selectedGroup.cdId === nextSelectedGroupId) selectedGroupSeedResolvedRef.current = false;
        setSelectedClusterId(null);
        setSelectedGroup(null);
        return;
      }

      if (selectedClusterId) {
        const clusterStillExists = initialClusters.some((cluster) => cluster.id === selectedClusterId);
        if (clusterStillExists) revealSelectionIfHidden(selectedClusterId);
        else setSelectedClusterId(null);
        return;
      }

      if (selectedGroupSeedResolvedRef.current || !nextSelectedGroupId) return;
      const lateSelection = findGroup(nextSelectedGroupId);
      if (!lateSelection) return;
      selectedGroupSeedResolvedRef.current = true;
      setSearchQuery('');
      setSelectedClusterId(lateSelection.cluster.id);
      setSelectedGroup(lateSelection.group);
      return;
    }

    selectedGroupSeedResolvedRef.current = false;

    if (!nextSelectedGroupId) {
      selectedGroupSeedResolvedRef.current = true;
      if (previousSelectedGroupId !== undefined) {
        setSelectedClusterId(null);
        setSelectedGroup(null);
      }
      return;
    }

    const seededSelection = findGroup(nextSelectedGroupId);
    if (seededSelection) {
      selectedGroupSeedResolvedRef.current = true;
      setSearchQuery('');
      setSelectedClusterId(seededSelection.cluster.id);
      setSelectedGroup(seededSelection.group);
      return;
    }
    setSelectedClusterId(null);
    setSelectedGroup(null);
  }, [
    hierarchySignature,
    initialClusters,
    selectedClusterId,
    selectedGroup,
    selectedGroupId,
    searchQuery,
  ]);

  // Filtered Nodes
  const visibleNodes = useMemo(
    () => filterCodeNodes(flattenedNodes, searchQuery),
    [flattenedNodes, searchQuery],
  );

  const handleSearchChange = (nextQuery: string) => {
    setSearchQuery(nextQuery);
    if (!selectedNodeId) return;
    if (filterCodeNodes(flattenedNodes, nextQuery).some((node) => node.id === selectedNodeId)) return;
    setSelectedClusterId(null);
    setSelectedGroup(null);
  };

  const handleEditDetail = (detail: CmmnDetailCode) => {
    if (!selectedGroup || isModalOpen || detailSubmitAttemptRef.current
      || detailSavePendingRef.current || detailDeletePendingRef.current) return;
    setModalTargetGroup({ cdId: selectedGroup.cdId, cdIdNm: selectedGroup.cdIdNm });
    setEditingDetail(detail);
    setIsOpen(true);
  };

  /** [P1-9] 확인 본문에 대상 식별자(코드·명칭)를 노출해 오삭제를 막는다. */
  const handleDeleteDetail = async (detail: CmmnDetailCode) => {
    if (!selectedGroup || isModalOpen || detailSubmitAttemptRef.current
      || detailSavePendingRef.current || detailDeletePendingRef.current) return;
    detailDeletePendingRef.current = true;
    const targetGroup = selectedGroup;
    const targetGroupId = targetGroup.cdId;
    setDeletingDetailKey(`${targetGroupId}:${detail.dtlCd}`);

    try {
      /*
       * [2026-10-20] 삭제는 행을 지우지 않고 사용 안 함으로 바꾼다(CommonCode#delete) — 종전 문구 '영구히 삭제합니다. 되돌릴 수
       * 없습니다'는 사실과 달랐다. 이 제품이 읽는 그룹이면 사용처를 함께 보인다.
       */
      const usages = codeUsagesOf(targetGroup);
      const ok = await confirm({
        title: '상세 코드 삭제',
        message: `‘${detail.dtlCdNm}’(코드 ${detail.dtlCd}) 를 ${targetGroup.cdIdNm} 그룹에서 삭제합니다. 행은 남고 사용 안 함으로 바뀌며, 수정에서 다시 사용으로 되돌릴 수 있습니다.`
          + (usages.length > 0 ? ' 이 제품이 읽는 그룹이라 아래 사용처에 영향이 있습니다.' : ''),
        variant: 'destructive',
        confirmText: '삭제',
        ...(usages.length > 0 ? { details: <CodeUsageList usages={usages} />, detailsLabel: CODE_USAGE_DETAILS_LABEL } : {}),
      });

      if (!ok) return;

      const res = await deleteCodeDetail(null, { cdId: targetGroupId, dtlCd: detail.dtlCd });
      if (res.success) {
        toast(res.message, 'success');
        await queryClient.invalidateQueries({ queryKey: ['cmmn-detail-codes', targetGroupId] });
      } else {
        toast(res.message, 'error');
      }
    } catch {
      toast('네트워크 오류가 발생했습니다.', 'error');
    } finally {
      detailDeletePendingRef.current = false;
      setDeletingDetailKey(null);
    }
  };

  const handleCreateDetail = () => {
    if (isModalOpen || detailSubmitAttemptRef.current
      || detailSavePendingRef.current || detailDeletePendingRef.current) return;
    if (!selectedGroup) {
      toast('코드 명세를 등록할 그룹 코드를 먼저 선택하십시오.', 'info');
      return;
    }
    setModalTargetGroup({ cdId: selectedGroup.cdId, cdIdNm: selectedGroup.cdIdNm });
    setEditingDetail(null);
    setIsOpen(true);
  };

  const forceCloseDetailModal = () => {
    setIsOpen(false);
    setEditingDetail(null);
    setModalTargetGroup(null);
  };

  const closeDetailModal = () => {
    if (detailSubmitAttemptRef.current || detailSavePendingRef.current
      || detailDeletePendingRef.current || form.formState.isSubmitting) return;
    forceCloseDetailModal();
  };

  const onSubmit = async (values: z.infer<typeof codeDetailFormSchema>) => {
    if (detailSavePendingRef.current || detailDeletePendingRef.current) return;
    if (!modalTargetGroup) {
      const message = '저장할 코드 그룹을 확인할 수 없습니다. 창을 닫고 다시 시도해 주세요.';
      form.setError('root.server', { type: 'server', message });
      void form.focusError('root.server', 'server');
      detailSubmitAttemptRef.current = false;
      return;
    }
    const targetGroupId = modalTargetGroup.cdId;

    /*
     * [2026-10-20] 이 제품이 읽는 그룹의 상세 코드를 사용 안 함으로 바꾸거나 이름을 바꾸면 그 사용처의 선택지·검증·표시 이름이
     * 바뀐다. 저장 전에 사용처를 보이고 확인을 받는다. 새 상세 코드 등록은 의도한 선택지 추가라 묻지 않는다.
     */
    const usages = codeUsagesOf(groups.find((group) => group.cdId === targetGroupId));
    if (editingDetail && usages.length > 0) {
      const disabling = editingDetail.useYn !== 'N' && values.useYn === 'N';
      const renaming = (editingDetail.dtlCdNm ?? '') !== values.dtlCdNm;
      if (disabling || renaming) {
        const ok = await confirm({
          title: disabling ? '이 제품이 읽는 상세 코드를 사용 안 함으로 전환' : '이 제품이 읽는 상세 코드의 이름 변경',
          message: `${codeGroupLabel(modalTargetGroup)} 그룹은 이 제품이 읽는 그룹입니다. ‘${editingDetail.dtlCdNm}’(코드 ${editingDetail.dtlCd})의 `
            + (disabling ? '사용 여부를 바꾸면' : '이름을 바꾸면') + ' 아래 사용처에 바로 반영됩니다.',
          details: <CodeUsageList usages={usages} />,
          detailsLabel: CODE_USAGE_DETAILS_LABEL,
          confirmText: '저장',
        });
        if (!ok) { detailSubmitAttemptRef.current = false; return; }
      }
    }

    detailSavePendingRef.current = true;
    setIsDetailSaving(true);
    try {
      const res = await saveCodeDetail(null, {
        ...values,
        useYn: values.useYn as 'Y' | 'N',
        cdId: targetGroupId,
        isNew: !editingDetail,
        // [2026-10-18] 수정 창을 열 때 읽은 버전 — 그 사이 다른 사람이 고쳤으면 서버가 409 로 거부해 덮어쓰지 않는다.
        version: editingDetail?.version,
      });

      if (res.success) {
        toast(res.message, 'success');
        await queryClient.invalidateQueries({ queryKey: ['cmmn-detail-codes', targetGroupId] });
        forceCloseDetailModal();
      } else {
        if (res.conflict) void queryClient.invalidateQueries({ queryKey: ['cmmn-detail-codes', targetGroupId] });
        if (!form.applyServerErrors(res)) {
          toast(res.message, 'error');
        }
      }
    } catch (error) {
      if (!form.applyServerErrors(error)) {
        toast('서버 통신 중 오류가 발생했습니다. 입력 내용은 유지되므로 잠시 후 다시 시도해 주세요.', 'error');
      }
    } finally {
      detailSavePendingRef.current = false;
      detailSubmitAttemptRef.current = false;
      setIsDetailSaving(false);
    }
  };

  const submitDetailForm = (event?: React.BaseSyntheticEvent) => {
    if (detailSubmitAttemptRef.current || detailSavePendingRef.current || detailDeletePendingRef.current) {
      event?.preventDefault();
      return;
    }
    detailSubmitAttemptRef.current = true;
    const submit = form.handleSubmit(onSubmit, () => {
      detailSubmitAttemptRef.current = false;
    });
    void submit(event).catch(() => {
      detailSubmitAttemptRef.current = false;
      detailSavePendingRef.current = false;
      setIsDetailSaving(false);
    });
  };

  const columns: Column<CmmnDetailCode>[] = [
    ...COMMON_DETAIL_COLUMNS,
    // 수정·삭제 권한이 하나도 없으면 관리 열을 두지 않는다.
    ...(canUpdateCode || canDeleteCode ? [{
      header: '관리',
      className: 'text-right w-24',
      accessor: (item: CmmnDetailCode) => {
        const isDeleting = deletingDetailKey === `${selectedGroup?.cdId}:${item.dtlCd}`;
        return (
          <div className="flex justify-end gap-1.5">
            {canUpdateCode && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`${item.dtlCdNm} 코드 수정`}
                disabled={isDetailWritePending || isModalOpen}
                className="hover:bg-muted rounded-lg transition-colors"
                onClick={(e) => { e.preventDefault(); handleEditDetail(item); }}
              >
                <Settings size={14} className="text-muted-foreground" aria-hidden="true" />
              </Button>
            )}
            {canDeleteCode && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`${item.dtlCdNm} 코드 ${isDeleting ? '삭제 중…' : '삭제'}`}
                aria-busy={isDeleting || undefined}
                disabled={isDetailWritePending || isModalOpen}
                className="text-destructive-emphasis hover:bg-destructive/10 rounded-lg transition-colors"
                onClick={(e) => { e.preventDefault(); handleDeleteDetail(item); }}
              >
                {isDeleting
                  ? <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  : <Trash2 size={14} aria-hidden="true" />}
              </Button>
            )}
          </div>
        );
      }
    }] : []),
  ];

  const activeNode = activeId ? flattenedNodes.find(n => n.id === activeId) : null;
  const saveDisabled = !hasExplorerChanges || !selectedNode || isSaving || isModalOpen || isPickerOpen;

  return (
    <div>
      <MasterDetailPage
        title="공통 코드 관리"
        headingLevel={embedded ? 2 : 1}
        description="코드 분류와 그룹을 선택해 상세 코드를 조회하고 관리합니다."
        breadcrumbItems={[{ label: '시스템관리' }, { label: '코드관리' }, { label: '공통 코드' }]}
        notice={notice}
        showBreadcrumb={!embedded}
        actions={canUpdateCode ? (
          <Button
            type="button"
            onClick={handleSaveExplorerChanges}
            disabled={saveDisabled}
            aria-busy={isSaving || undefined}
            className="gap-2"
          >
            <Save size={16} aria-hidden="true" />
            {isSaving ? '그룹 소속 저장 중…' : '그룹 소속 저장'}
          </Button>
        ) : undefined}
        masterTitle="코드 분류 및 그룹"
        // 건수는 다른 시험이 동시에 분류·그룹을 만들면 바뀌는 값이라 tabular-nums 로 둔다(시각 회귀 mask 가 가린다).
        masterDescription={<>분류 <span className="tabular-nums">{clCodes.length}</span>개 · 그룹 <span className="tabular-nums">{groups.length}</span>개</>}
        masterTools={(
          <div className="flex flex-wrap items-center gap-2">
            {canCreateCode && (
              <Button type="button" variant="outline" size="sm" onClick={openCreateCluster}>
                분류 등록
              </Button>
            )}
            {canCreateCode && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openCreateGroup}
                disabled={clCodes.length === 0}
                title={clCodes.length === 0 ? '코드 그룹은 분류에 속해야 합니다. 분류를 먼저 등록하세요.' : undefined}
              >
                그룹 등록
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => setIsPickerOpen(true)}>
              코드 검색
            </Button>
          </div>
        )}
        master={(
          <div className="space-y-3">
            <div className="relative">
              <Search size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="분류·그룹명 또는 코드로 검색"
                aria-label="분류·그룹명 또는 코드로 검색"
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                className="pl-10"
              />
            </div>
            {searchQuery && canUpdateCode && (
              <p className="text-xs text-muted-foreground">검색 중에는 코드 그룹의 소속 분류를 변경할 수 없습니다.</p>
            )}

            {visibleNodes.length === 0 ? (
              <div role="status" className="flex min-h-40 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <SearchSlash size={28} aria-hidden="true" />
                <p className="text-sm font-semibold">
                  {loadFailed
                    ? '코드 분류·그룹을 불러오지 못했습니다.'
                    : searchQuery
                      ? '검색 결과가 없습니다'
                      : '등록된 코드 분류·그룹이 없습니다.'}
                </p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                accessibility={{
                  announcements: dndAnnouncements,
                  screenReaderInstructions: CODE_DND_SCREEN_READER_INSTRUCTIONS,
                }}
                collisionDetection={closestCenter}
                measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={() => setActiveId(null)}
              >
                <SortableContext items={visibleNodes.map((node) => node.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1">
                    {visibleNodes.map((node, index) => {
                      const isSelected = selectedNode?.id === node.id;
                      return (
                        <SortableCodeNode
                          key={node.id}
                          node={node}
                          isSelected={isSelected}
                          tabIndex={isSelected || (!selectedNode && index === 0) ? 0 : -1}
                          dragDisabled={Boolean(searchQuery) || isSaving}
                          reorderable={canUpdateCode}
                          parentClassificationName={node.type === 'group'
                            ? flattenedNodes.find((candidate) => candidate.type === 'cluster' && candidate.id === node.parentId)?.name
                            : undefined}
                          onClick={() => selectNode(node)}
                        />
                      );
                    })}
                  </div>
                </SortableContext>

                {typeof document !== 'undefined' && createPortal(
                  <DragOverlay dropAnimation={dropAnimation}>
                    {activeId && activeNode ? (
                      <CodeNodeOverlay node={activeNode} />
                    ) : null}
                  </DragOverlay>,
                  document.body,
                )}
              </DndContext>
            )}
          </div>
        )}
        selectedItemLabel={selectedNode?.name}
        detailTitle="코드 상세"
        detailDescription={selectedNode?.type === 'group'
          ? (selectedNode.data.cdIdExpln || `그룹 코드 ${selectedNode.id}`)
          : selectedNode?.type === 'cluster'
            ? `분류 코드 ${selectedNode.id}`
            : undefined}
        detailActions={
          selectedGroup || selectedNode?.type === 'cluster' ? (
            <CommonCodeDetailActions
              selectedGroup={selectedGroup}
              selectedNode={selectedNode}
              canCreateCode={canCreateCode}
              canUpdateCode={canUpdateCode}
              isDetailWritePending={isDetailWritePending}
              isModalOpen={isModalOpen}
              isStructureFormPending={isStructureFormPending}
              onCreateDetail={handleCreateDetail}
              onEditGroup={openEditGroup}
              onEditCluster={openEditCluster}
              onOpenHistory={setHistoryTarget}
            />
          ) : undefined
        }
        detail={
          selectedNode?.type === 'group' || selectedNode?.type === 'cluster' ? (
            <CommonCodeDetailPanel
              selectedNode={selectedNode}
              embedded={embedded}
              detailsLoading={detailsLoading}
              detailList={detailList}
              detailsError={detailsError as Error | null}
              columns={columns}
              groupCount={selectedNode.type === 'cluster' ? groupCountOf(selectedNode.id) : 0}
              onRetryDetails={() => { void refetchDetails(); }}
            />
          ) : undefined
        }
        emptyDetailTitle="선택된 코드 없음"
        emptyDetailDescription="왼쪽 목록에서 코드 분류 또는 그룹을 선택하세요."
        onSaveShortcut={canUpdateCode ? handleSaveExplorerChanges : undefined}
        saveShortcutDisabled={saveDisabled}
      />


      {/* 구조(분류·그룹) 편집 모달 — 상세 코드 모달과 폼 패턴을 공유한다. */}
      <StandardModal
        isOpen={structureModal !== null}
        onClose={closeStructureModal}
        closeDisabled={isStructureFormPending}
        title={structureModal?.kind === 'cluster'
          ? (structureModal.mode === 'create' ? '코드 분류 등록' : '코드 분류 수정')
          : (structureModal?.mode === 'create' ? '코드 그룹 등록' : '코드 그룹 수정')}
        maxWidth="2xl"
        footer={
          <div className="flex w-full gap-4">
            <Button
              variant="outline"
              onClick={closeStructureModal}
              disabled={isStructureFormPending}
              className="flex-1 rounded-lg border-2 border-border text-xs font-bold shadow-sm"
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={() => submitStructureForm()}
              disabled={isStructureFormPending}
              aria-busy={isStructureFormPending || undefined}
              className="flex-[2] rounded-lg border-none bg-primary text-xs font-bold text-primary-foreground shadow-sm"
            >
              <Save size={18} aria-hidden="true" />
              {isStructureFormPending ? '저장 중…' : '저장'}
            </Button>
          </div>
        }
      >
        {structureModal?.kind === 'cluster' ? (
          <Form {...clusterForm}>
            <form noValidate onSubmit={submitStructureForm} className="space-y-8 pt-4">
              <FormErrorSummary labels={CODE_CLUSTER_FIELD_LABELS} onNavigate={clusterForm.focusError} />
              <CodeClusterFields form={clusterForm} mode={structureModal.mode} />
            </form>
          </Form>
        ) : structureModal ? (
          <Form {...groupForm}>
            <form noValidate onSubmit={submitStructureForm} className="space-y-8 pt-4">
              <FormErrorSummary labels={CODE_GROUP_FIELD_LABELS} onNavigate={groupForm.focusError} />
              <CodeGroupFields form={groupForm} mode={structureModal.mode} clCodes={clCodes} />
            </form>
          </Form>
        ) : null}
      </StandardModal>

      {historyTarget && (
        <CommonCodeChangeHistoryDialog target={historyTarget} onClose={() => setHistoryTarget(null)} />
      )}

      {/* CodePicker — 그룹→코드 2단 검색 팝업 (1호 소비처) */}
      <CodePicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handlePickCode}
      />

      {/* Standard Modal for CRUD */}
      <StandardModal
        isOpen={isModalOpen}
        onClose={closeDetailModal}
        title={editingDetail ? '아키텍처 명세 수정' : '신규 명세 등록'}
        maxWidth="3xl"
        footer={
          <div className="flex w-full gap-4">
            <Button
              variant="outline"
              onClick={closeDetailModal}
              disabled={isDetailWritePending}
              className="flex-1 rounded-lg border-2 border-border text-xs font-bold shadow-sm"
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={() => submitDetailForm()}
              disabled={isDetailWritePending}
              aria-busy={isDetailFormPending || undefined}
              className="flex-[2] rounded-lg border-none bg-primary text-xs font-bold text-primary-foreground shadow-sm"
            >
              <Plus size={18} aria-hidden="true" className="group-hover:rotate-90 transition-transform" />
              {isDetailFormPending ? '저장 중…' : '저장'}
            </Button>
          </div>
        }
      >
        <Form {...form}>
          <form noValidate onSubmit={submitDetailForm} className="space-y-10 pt-4">
            <FormErrorSummary
              labels={CODE_DETAIL_FIELD_LABELS}
              onNavigate={form.focusError}
            />
            <CodeDetailFields form={form} parentGroupId={modalTargetGroup?.cdId} isEditing={!!editingDetail} />
          </form>
        </Form>
      </StandardModal>
    </div>
  );
}

