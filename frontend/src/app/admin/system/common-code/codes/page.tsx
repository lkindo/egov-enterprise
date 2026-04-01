'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectToUnifiedCode() {
 const router = useRouter();

 useEffect(() => {
 router.replace('/admin/system/common-code');
 }, [router]);

 return (
 <div className="flex items-center justify-center min-h-[400px]">
 <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 animate-pulse">
 <p className="text-sm font-medium text-slate-500">?µí•© ê´€ë¦??”ë©´?¼ë¡œ ?´ë™ ì¤?..</p>
 </div>
 </div>
 );
}
