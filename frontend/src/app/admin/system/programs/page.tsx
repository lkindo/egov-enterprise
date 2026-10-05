import { Suspense } from 'react';
import ProgramAdminClient from './ProgramAdminClient';
import { SITE_IDENTITY } from '@/config/site-identity';

// [2026-10-02 D3] 메뉴명 '프로그램 관리' → '화면 관리'(사용자 사전 승인). 라우트는 그대로다.
// [2026-10-04 프로그램 목록 퇴역] '이전 프로그램' 탭을 걷어 이 화면은 앱 화면 목록 하나다. 서버 컴포넌트가 읽던 프로그램 목록
//   첫 쪽(과 그 401 로그인 이동·`?page=` 해석)도 함께 걷었다. 화면 목록은 앱에 들어 있어(생성된 화면 목록) 조회하지 않고,
//   연결 메뉴(메뉴 구조, MENU_READ)는 화면이 권한을 확인한 뒤 읽는다(useMenuStructureSource).
export const metadata = {
  title: `화면 관리 | ${SITE_IDENTITY.frameworkName}`,
  description: '앱 화면과 그 진입 권한·연결 메뉴를 봅니다.',
};

export default function ProgramAdminPage() {
  return (
    // 루트 레이아웃이 이미 max-w-7xl · p-6/md:p-12/lg:p-16 을 제공하므로 화면 단위 p-8 이중 여백을 제거한다.
    // [2026-10-05] 감싸던 pb-32(128px) 여백도 걷었다 — 화면이 fill 셸이라 셸 아래에 다른 블록이나 하단 여백을 두면 페이지가
    //   다시 스크롤한다(카탈로그 §4 'fill 셸'). 종전에도 본문 아래 패딩(lg 64px)과 겹쳐 빈 공간만 늘렸다.
    <Suspense fallback={
      <div className="animate-pulse space-y-12">
        <h1 className="sr-only">화면 관리를 불러오는 중</h1>
        <div className="h-11 bg-muted rounded-lg w-1/3" />
        <div className="h-[600px] bg-muted rounded-lg" />
      </div>
    }>
      <ProgramAdminClient />
    </Suspense>
  );
}
