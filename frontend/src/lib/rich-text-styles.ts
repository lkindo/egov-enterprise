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
