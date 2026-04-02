import { Suspense } from 'react';
import { operationAdminService } from '@/services/foundation/operation/OperationAdminService';
import RewardManageClient from './RewardManageClient';

export const metadata = {
 title: 'ъ긽 관리| ?꾩옄?뺣? ?쒖님꾨젅?꾩썙님,
 description: '?꾩쭅님ъ긽 諛님곹썕 ?뺣낫瑜관리ы빀?덈떎.',
};

export default async function RewardManagePage() {
 let initialData: any[] = [];
 try {
 const res = await operationAdminService.getRewardList();
 initialData = res.list || [];
 } catch {
 console.error('Failed to fetch initial reward info:', error);
 }

 return (
 <Suspense fallback={<div>濡쒕뵫 중..</div>}>
 <RewardManageClient initialData={initialData} />
 </Suspense>
 );
}

