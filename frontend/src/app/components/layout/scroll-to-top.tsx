'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function ScrollToTop() {
 const pathname = usePathname();
 const searchParams = useSearchParams();

 useEffect(() => {
 // ?˜ì´ì§€ ê²½ë¡œê°€ ë°”ë€??Œë§ˆ???ˆë„???¤í¬ë¡¤ì„ ?ë‹¨?¼ë¡œ ?´ë™
 // setTimeout???¬ìš©?˜ì—¬ ?Œë”ë§????¤í¬ë¡¤ì´ ?•ì‹¤?˜ê²Œ ?™ìž‘?˜ë„ë¡?? ë„
 const timeoutId = setTimeout(() => {
 window.scrollTo(0, 0);
 }, 10);

 return () => clearTimeout(timeoutId);
 }, [pathname, searchParams]);

 return null;
}
