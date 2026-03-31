'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, ChevronRight } from 'lucide-react';
import { menuService } from '@/services/business/user/MenuService';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  name: string;
  href?: string;
}

export function DynamicBreadcrumb({ customItems = [] }: { customItems?: BreadcrumbItem[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<BreadcrumbItem[]>([]);

  useEffect(() => {
    const fetchPath = async () => {
      try {
        const menus = await menuService.getHeadMenus() || [];
        const path: BreadcrumbItem[] = [];
        
        if (!Array.isArray(menus)) return;
        
        // ê²Œì‹œ??ID(bbsId)ê°€ ì¿¼ë¦¬ ?¤íŠ¸ë§ì— ?ˆëŠ” ê²½ìš°, ?´ë‹¹ ë©”ë‰´ë¥??°ì„  ?ìƒ‰
        const bbsIdParam = searchParams.get('bbsId');
        
        // 1. ë©”ë‰´ ?¸ë¦¬?ì„œ ?„ìž¬ ê²½ë¡œ ?ëŠ” BBS IDê°€ ?°ê²°??ë©”ë‰´ ì°¾ê¸°
        const findPath = (menuList: any[], targetPath: string, searchBbsId?: string | null): boolean => {
          for (const menu of menuList) {
            // ?„ë??”ëœ ?¼ìš°??modernRoute)ê°€ ?ˆê³ , ?„ìž¬ ê²½ë¡œ?€ ?¼ì¹˜?˜ê±°??            // ?´ë‹¹ ë©”ë‰´??ì¿¼ë¦¬ ?¤íŠ¸ë§ì— bbsIdê°€ ?¬í•¨?˜ì–´ ?ˆëŠ”ì§€ ?•ì¸
            const isMatch = (menu.modernRoute && (targetPath === menu.modernRoute || targetPath.startsWith(menu.modernRoute + '/'))) 
                          || (searchBbsId && menu.modernRoute?.includes(`bbsId=${searchBbsId}`));

            if (isMatch) {
              path.push({ name: menu.menuNm, href: menu.modernRoute });
              return true;
            }
            if (menu.children && findPath(menu.children, targetPath, searchBbsId)) {
              path.unshift({ name: menu.menuNm, href: menu.modernRoute });
              return true;
            }
          }
          return false;
        };

        findPath(menus, pathname, bbsIdParam);
        
        // ë§Œì•½ ë©”ë‰´ ?¸ë¦¬?ì„œ ëª?ì°¾ì•˜?¤ë©´ (ê´€ë¦¬ìž/?¹ìˆ˜ ?˜ì´ì§€ ??
        if (path.length === 0) {
          if (pathname.includes('/admin/system')) path.push({ name: '?œìŠ¤??ê´€ë¦? });
          if (pathname.includes('/community/boards')) path.push({ name: 'ì»¤ë??ˆí‹° ë°?ì½˜í…ì¸? });
        }

        setItems(path);
      } catch (err) {
        console.error('Failed to resolve breadcrumb path', err);
      }
    };

    fetchPath();
  }, [pathname]);

  // ì»¤ìŠ¤?€ ?„ì´?œì´ ?ˆìœ¼ë©?ì¶”ê? (?? ê²Œì‹œê¸€ ?œëª© ??
  const finalItems = customItems.length > 0 ? customItems : items;

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-3 px-5 rounded-full w-fit mb-4 border border-primary/5 shadow-sm">
      <Link href="/" className="hover:text-foreground flex items-center gap-1.5 transition-colors">
        <Home className="w-4 h-4" /> ??      </Link>
      
      {finalItems.map((item, index) => (
        <React.Fragment key={`${item.name}-${index}`}>
          <ChevronRight className="w-4 h-4 opacity-30" />
          {item.href && index < finalItems.length - 1 ? (
            <Link href={item.href} className="hover:text-primary transition-colors font-bold">
              {item.name}
            </Link>
          ) : (
            <span className={cn("font-black", index === finalItems.length - 1 ? "text-foreground" : "")}>
              {item.name}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
