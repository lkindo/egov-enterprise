/**
 * 게시판·FAQ·정책 본문과 게시판 편집기가 같이 쓰는 기본 서식.
 *
 * [2026-11-21] 본문과 편집기는 서식 플러그인(@tailwindcss/typography)이 만드는 클래스에 기대고 있었는데 그 플러그인이
 * 설치돼 있지 않았다 — Tailwind 의 기본 스타일 초기화가 제목 크기·목록 표지·인용 들여쓰기를 지워, 편집기에서 '제목 1'·
 * 목록·인용을 골라도 본문과 같은 모양으로 보였다. 플러그인을 들이는 대신 설계 토큰만 쓰는 최소 규칙을 둔다(새 의존성과
 * CSS 예산을 늘리지 않는다). 편집기와 본문이 같은 상수를 써서 편집기에서 본 모양이 저장된 본문과 같다.
 */
export const RICH_TEXT_CONTENT_CLASSES = [
  'max-w-none break-words text-foreground',
  '[&_p]:my-2',
  '[&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:leading-tight',
  '[&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:leading-snug',
  '[&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold',
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1',
  '[&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:bg-primary/5 [&_blockquote]:px-4 [&_blockquote]:py-2',
  '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2',
  '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono',
  '[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_hr]:my-4 [&_hr]:border-border',
  '[&_img]:h-auto [&_img]:max-w-full',
].join(' ');

/** 게시판 편집기와 본문에서 같은 표 모양과 셀 선택 표시를 사용한다. */
export const RICH_TEXT_TABLE_CLASSES = [
  'min-w-0 max-w-full overflow-x-auto',
  '[&_table]:w-full [&_table]:table-fixed [&_table]:border-collapse',
  '[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold',
  '[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2',
  '[&_th]:align-top [&_td]:align-top [&_th]:break-words [&_td]:break-words',
  '[&_th_p]:my-1 [&_td_p]:my-1',
  '[&_.selectedCell]:bg-primary/15 [&_.selectedCell]:outline [&_.selectedCell]:outline-primary',
].join(' ');
