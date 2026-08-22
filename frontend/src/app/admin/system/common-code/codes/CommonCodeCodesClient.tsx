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
 <div className="p-8 rounded-lg bg-muted border border-border animate-pulse">
 <h1 className="sr-only">공통코드 통합 관리 화면으로 이동 중</h1>
 <p className="text-sm font-medium text-muted-foreground">통합 관리 화면으로 이동 중...</p>
 </div>
 </div>
 );
}

