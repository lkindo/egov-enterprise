import { Suspense } from 'react';
import { operationAdminService } from '@/services/admin/operation/OperationAdminService';
import RewardManageClient from './RewardManageClient';

export const metadata = {
 title: '포상 관리 | 전자정부 표준프레임워크',
 description: '임직원 포상 및 상훈 정보를 관리합니다.',
};

export default async function RewardManagePage() {
 let initialData: any[] = [];
 try {
 const res = await operationAdminService.getRewardList();
 initialData = res.list || [];
 } catch (error) {
 console.error('Failed to fetch initial reward info:', error);
 }

 return (
 <Suspense fallback={<div>로딩 중...</div>}>
 <RewardManageClient initialData={initialData} />
 </Suspense>
 );
}
