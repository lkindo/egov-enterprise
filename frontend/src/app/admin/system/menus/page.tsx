import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { menuAdminService } from '@/services/menuAdminService';
import { programService } from '@/services/programService';
import MenuAdminClient from './MenuAdminClient';

export const metadata = {
  title: '시스템 메뉴 아키텍처 | 전자정부 표준프레임워크',
  description: '시스템 트리 구조와 프로그램 연결을 체계적으로 관리합니다.',
};

export default async function MenuAdminPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

  // Parallel fetching of menus and programs to eliminate waterfalls
  let menus: any[] = [];
  let programs: any[] = [];
  let isUnauthorized = false;

  try {
    const [menuData, programData] = await Promise.all([
      menuAdminService.getAllMenus(axiosConfig),
      programService.getPrograms({ page: 0, size: 1000 }, axiosConfig)
    ]);

    menus = menuData || [];
    programs = programData?.content || [];
  } catch (error: any) {
    if (error.response?.status === 401) {
      isUnauthorized = true;
    } else {
      console.error('Server-side fetch menu architecture failed:', error);
    }
  }

  if (isUnauthorized) {
    redirect('/login?expired=true');
  }

  return (
    <Suspense fallback={<MenuAdminLoading />}>
      <MenuAdminClient initialMenus={menus} programs={programs} />
    </Suspense>
  );
}

function MenuAdminLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-pulse">
      <div className="h-14 w-80 bg-slate-100 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[1, 2, 3].map(i => <div key={i} className="h-40 bg-slate-50 rounded-[2.5rem]" />)}
      </div>
      <div className="h-40 w-full bg-slate-100/50 rounded-[3rem]" />
      <div className="space-y-4">
        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-24 bg-slate-50 rounded-[2rem]" />)}
      </div>
    </div>
  );
}
