import { Suspense } from 'react';
import { operationAdminService } from '@/services/foundation/operation/OperationAdminService';
import RewardManageClient from './RewardManageClient';

export const metadata = {
 title: '?¬ìƒ ê´€ë¦?| ?„ì?•ë? ?œì??„ë ˆ?„ì›Œ??,
 description: '?„ì§???¬ìƒ ë°??í›ˆ ?•ë³´ë¥?ê´€ë¦¬í•©?ˆë‹¤.',
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
 <Suspense fallback={<div>ë¡œë”© ì¤?..</div>}>
 <RewardManageClient initialData={initialData} />
 </Suspense>
 );
}
