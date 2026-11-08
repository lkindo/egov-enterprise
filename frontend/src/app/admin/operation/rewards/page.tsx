import { Suspense } from 'react';
import {
  rewardAdminService,
  type Reward,
} from '@/services/foundation/operation/RewardAdminService';
import type { PageResponse } from '@/types/foundation/system';
import RewardManageClient from './RewardManageClient';

export const metadata = {
  title: '포상 및 상훈 관리 | 전자정부 프레임워크',
  description: '운영 관리 포상 및 상훈 정보를 관리합니다.',
};

const PAGE_SIZE = 10;

export default async function RewardManagePage() {
  // [2026-11-08 화면 용어 원장 후속] 실패하면 빈 페이지(total 0)가 아니라 null 을 넘긴다 — 빈 페이지는 받은 값으로 쓰여
  //   첫 화면이 "총 0건" 이 되고 오프라인이면 그대로 남았다. null 이면 클라이언트가 다시 조회하고, 실패하면 오류로 드러낸다(외부 인사와 같다).
  let initialPage: PageResponse<Reward> | null = null;
  try {
    // 서버는 1부터 세는 page 를 받는다(ADR-0036)
    initialPage = await rewardAdminService.getRewardList({ page: 1, size: PAGE_SIZE });
  } catch {
    // Axios 오류 객체는 서버 로그로 보내지 않는다.
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><h1 className="sr-only">포상 관리를 불러오는 중</h1>로딩 중..</div>}>
      <RewardManageClient initialPage={initialPage} />
    </Suspense>
  );
}
