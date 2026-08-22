import { Suspense } from 'react';
import {
  operationAdminService,
  emptyPage,
  type Reward,
} from '@/services/foundation/operation/OperationAdminService';
import type { PageResponse } from '@/types/foundation/system';
import RewardManageClient from './RewardManageClient';

export const metadata = {
  title: '포상 및 상훈 관리 | 전자정부 프레임워크',
  description: '운영 관리 포상 및 상훈 정보를 관리합니다.',
};

const PAGE_SIZE = 10;

export default async function RewardManagePage() {
  let initialPage: PageResponse<Reward> = emptyPage<Reward>(PAGE_SIZE);
  try {
    // 서버는 0-based Pageable 을 받는다 (page=0 → 1페이지)
    initialPage = await operationAdminService.getRewardList({ page: 0, size: PAGE_SIZE });
  } catch {
    // 기존 empty seed fallback을 유지하되 Axios 오류 객체는 서버 로그로 보내지 않는다.
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><h1 className="sr-only">포상 관리를 불러오는 중</h1>로딩 중..</div>}>
      <RewardManageClient initialPage={initialPage} />
    </Suspense>
  );
}
