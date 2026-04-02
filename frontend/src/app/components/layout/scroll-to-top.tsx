'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function ScrollToTop() {
 const pathname = usePathname();
 const searchParams = useSearchParams();

 useEffect(() => {
 // ?섏씠吏 경로媛 諛붾님뚮쭏님?덈룄님ㅽ겕濡ㅼ쓣 ?곷떒?쇰줈 ?대룞
 // setTimeout님ъ슜?섏뿬 ?뚮뜑留님님ㅽ겕濡ㅼ씠 ?뺤떎?섍쾶 ?숈옉?섎룄濡님좊룄
 const timeoutId = setTimeout(() => {
 window.scrollTo(0, 0);
 }, 10);

 return () => clearTimeout(timeoutId);
 }, [pathname, searchParams]);

 return null;
}

