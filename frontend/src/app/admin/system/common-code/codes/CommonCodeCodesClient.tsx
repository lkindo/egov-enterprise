'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CommonCodeCodesClient() {
 const router = useRouter();

 useEffect(() => {
 router.replace('/admin/system/common-code');
 }, [router]);

 return (
 <div className="flex items-center justify-center min-h-[400px]">
 <div className="p-8 rounded-lg bg-slate-50 border border-slate-100 animate-pulse">
 <p className="text-sm font-medium text-slate-500">통합 관리님붾㈃쇰줈 ?대룞 중..</p>
 </div>
 </div>
 );
}

