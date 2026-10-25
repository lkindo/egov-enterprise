import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * 없는 주소와 게시되지 않은(게시 중지·보관 포함) 콘텐츠 페이지는 같은 화면이다 — 서버가 모두 404 로 답해 미게시 페이지의 존재를
 * 드러내지 않는다(ADR-0039 결정 9). 메뉴는 게시 여부와 따로 저장되므로, 메뉴로 들어온 사용자에게 그 가능성을 말한다.
 *
 * [ADR-0042] 돌아갈 길은 게시된 안내 페이지 목록과 업무 홈 두 곳이다(조회 오류 화면과 같다).
 */
export default function ContentPageNotFound() {
  return (
    <div className="mx-auto w-full max-w-[var(--page-max-w)] space-y-3">
      <h1 className="text-xl font-bold tracking-tight text-foreground">없거나 게시되지 않은 페이지입니다</h1>
      <p className="text-[length:var(--font-size-body)] text-muted-foreground">
        주소가 맞는지 확인해 주세요. 메뉴로 들어왔다면 게시가 중지된 페이지일 수 있습니다 — 관리자에게 알려 주세요.
        게시된 안내 페이지는 목록에서 찾을 수 있습니다.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link href="/pages" className={cn(buttonVariants({ variant: 'outline' }))}>안내 페이지 목록</Link>
        <Link href="/" className={cn(buttonVariants({ variant: 'outline' }))}>업무 홈으로</Link>
      </div>
    </div>
  );
}
