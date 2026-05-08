import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { networkAdminService, Network } from '@/services/foundation/system/NetworkAdminService';
import NetworkAdminClient from './NetworkAdminClient';

export const metadata = {
  title: '?¤íŠ¸?Œí¬ ?¸í”„??ì§€??ê´€ë¦?ë°?ìµœì ??| ?„ì?•ë? ?œì??„ë ˆ?„ì›Œ??,
  description: '?œìŠ¤???„ë°˜???¤íŠ¸?Œí¬ ? í´ë¡œì? ?•ë³´ë¥?ê´€ë¦¬í•˜ê³?ìµœì ???°ê²°?±ì„ ë³´ì¥?©ë‹ˆ??,
};

async function NetworkDataContainer() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // [Eliminating Waterfalls] ?œë²„ ?¬ì´??ì´ˆê¸° ?°ì´???˜ì¹­
  let initialNetworks: Network[] = [];

  try {
    const response = await networkAdminService.getNetworks({ page: 0, size: 100 }, axiosConfig);
    initialNetworks = (response as any)?.content || (response as any)?.data?.content || (response as any) || [];
  } catch (error) {
    console.error('Server-side fetch network data failed:', error);
  }

  return <NetworkAdminClient initialNetworks={initialNetworks} />;
}

export default function AdminNetworkPage() {
  return (
    <Suspense fallback={<NetworkAdminLoading />}>
      <NetworkDataContainer />
    </Suspense>
  );
}

function NetworkAdminLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-pulse pb-24 h-[calc(100vh-120px)] flex flex-col text-left">
      <div className="h-11 w-96 bg-slate-100 rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 shrink-0">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-44 bg-slate-50 rounded-lg" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 shrink-0">
        <div className="md:col-span-2 h-64 bg-slate-900/5 rounded-lg" />
        <div className="h-64 bg-slate-50 rounded-lg" />
      </div>
      <div className="flex-1 bg-slate-100/50 rounded-lg p-12 mt-8" />
    </div>
  );
}
