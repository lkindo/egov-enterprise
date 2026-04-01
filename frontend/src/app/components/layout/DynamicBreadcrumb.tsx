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
        
        // 寃뚯떆님ID(bbsId)媛 荑쇰━ ?ㅽ듃留곸뿉 ?덈뒗 寃쎌슦, ?대떦 硫붾돱瑜님곗꽑 ?먯깋
        const bbsIdParam = searchParams.get('bbsId');
        
        // 1. 硫붾돱 ?몃━?먯꽌 현재 寃쎈줈 ?먮뒗 BBS ID媛 ?곌껐님硫붾돱 李얘린
        const findPath = (menuList: any[], targetPath: string, searchBbsId?: string | null): boolean => {
          for (const menu of menuList) {
            // ?꾨님붾맂 ?쇱슦님modernRoute)媛 ?덇퀬, 현재 寃쎈줈? ?쇱튂?섍굅님            // ?대떦 硫붾돱님荑쇰━ ?ㅽ듃留곸뿉 bbsId媛 ?ы븿?섏뼱 ?덈뒗吏 ?뺤씤
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
        
        // 留뚯빟 硫붾돱 ?몃━?먯꽌 紐?李얠븯?ㅻ㈃ (愿由ъ옄/?뱀닔 ?섏씠吏 님
        if (path.length === 0) {
          if (pathname.includes('/admin/system')) path.push({ name: '?쒖뒪님愿由? });
          if (pathname.includes('/community/boards')) path.push({ name: '而ㅻ님덊떚 諛?肄섑뀗痢? });
        }

        setItems(path);
      } catch (err) {
        console.error('Failed to resolve breadcrumb path', err);
      }
    };

    fetchPath();
  }, [pathname]);

  // 而ㅼ뒪? ?꾩씠?쒖씠 ?덉쑝硫?異붽? (님 寃뚯떆湲 ?쒕ぉ 님
  const finalItems = customItems.length > 0 ? customItems : items;

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-3 px-5 rounded-full w-fit mb-4 border border-primary/5 shadow-sm">
      <Link href="/" className="hover:text-foreground flex items-center gap-1.5 transition-colors">
        <Home className="w-4 h-4" /> 님      </Link>
      
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

