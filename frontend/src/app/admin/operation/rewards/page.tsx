import { Suspense } from 'react';
import { operationAdminService } from '@/services/foundation/operation/OperationAdminService';
import RewardManageClient from './RewardManageClient';

export const metadata = {
  title: '포상 및 상훈 관리 | 전자정부 프레임워크',
  description: '운영 관리 포상 및 상훈 정보를 관리합니다.',
};

export default async function RewardManagePage() {
  let initialData: any[] = [];
  try {
    const res = await operationAdminService.getRewardList();
    initialData = res.list || [];
  } catch (error) {
    console.error('Failed to fetch initial reward info');
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]">로딩 중..</div>}>
      <RewardManageClient initialData={initialData} />
    </Suspense>
  );
}
