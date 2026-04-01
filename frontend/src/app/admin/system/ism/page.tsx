import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { ismAdminService, InfrmlSanctn } from '@/services/foundation/system/IsmAdminService';
import IsmClient from './IsmClient';
import { selectFieldsList } from '@/lib/utils/serialization';

export const metadata = {
 title: '?½ì‹ê²°ì¬ ë°??¹ì¸ ê´€ë¦?| ?„ì?•ë? ?œì??„ë ˆ?„ì›Œ??,
 description: '?œìŠ¤????ë°œìƒ?˜ëŠ” ?½ì‹ ê²°ì¬ ?”ì²­???¹ì¸ ?ëŠ” ë°˜ë ¤ ì²˜ë¦¬?©ë‹ˆ??',
};

export default async function InformalSanctionPage() {
 const cookieStore = await cookies();
 const accessToken = cookieStore.get('accessToken')?.value;
 const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

 let rawData: any = { content: [] as InfrmlSanctn[], totalElements: 0, totalPages: 0 };

 try {
 rawData = await ismAdminService.getInfrmlSanctnList({ page: 0, size: 50 }, axiosConfig);
 } catch {
 console.error('Server-side fetch ism failed:', error);
 }

 // [Server Serialization Optimization]
 const optimizedContent = selectFieldsList(rawData.content as InfrmlSanctn[], [
 'infrmlSanctnId', 'jobSe', 'jobSeCode', 'applcntId', 'confmAt', 'sancltNm'
 ] as (keyof InfrmlSanctn)[]);

 return (
 <Suspense fallback={<IsmLoading />}>
 <IsmClient initialData={{ ...rawData, content: optimizedContent as InfrmlSanctn[] }} />
 </Suspense>
 );
}

function IsmLoading() {
 return (
 <div className="max-w-6xl mx-auto space-y-12 animate-pulse pb-20">
 <div className="h-20 w-1/3 bg-slate-100 rounded-2xl" />
 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
 {[1, 2, 3].map(i => <div key={i} className="h-44 bg-slate-50 rounded-[3rem]" />)}
 </div>
 <div className="h-[600px] bg-slate-50 rounded-[4rem]" />
 </div>
 );
}
