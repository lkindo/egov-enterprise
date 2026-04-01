import { Suspense } from 'react';
import { operationAdminService } from '@/services/foundation/operation/OperationAdminService';
import RewardManageClient from './RewardManageClient';

export const metadata = {
 title: '?ъ긽 愿由?| ?꾩옄?뺣? ?쒖님꾨젅?꾩썙님,
 description: '?꾩쭅님?ъ긽 諛님곹썕 ?뺣낫瑜?愿由ы빀?덈떎.',
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
 <Suspense fallback={<div>濡쒕뵫 以?..</div>}>
 <RewardManageClient initialData={initialData} />
 </Suspense>
 );
}

