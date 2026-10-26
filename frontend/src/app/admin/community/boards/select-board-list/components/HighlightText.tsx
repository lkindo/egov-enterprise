import type { ReactNode } from 'react';

/**
 * 검색어를 글자 그대로 찾아 강조한다(대소문자 무시).
 *
 * [2026-10-26 ADR-0043 0차 UX-01] 종전에는 검색어를 정규식 원문으로 `new RegExp(`(${highlight})`)` 에 넣었다. 'C++'·'('·'?'·'['
 * 같은 검색어는 정규식 문법 오류(SyntaxError)를 던져 목록 화면 전체가 오류 경계로 바뀌었고, 내용 검색에서는 '(' 처럼 흔한 문자로도
 * 결과가 생겨 쉽게 재현됐다. 정규식을 쓰지 않고 indexOf 로 나눈다 — 이스케이프를 빠뜨려 같은 결함이 돌아올 자리를 남기지 않는다.
 */
export const HighlightText = ({ text, highlight }: { text: string | undefined; highlight: string }) => {
  if (!text) return null;
  const needle = highlight.trim();
  if (!needle) return <>{text}</>;

  // 소문자로 바꿔도 길이가 그대로일 때만 대소문자를 무시한다 — 길이가 바뀌는 문자(예: 'İ')가 있으면 위치가 어긋나므로 글자 그대로 찾는다.
  const lowerText = text.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  const caseless = lowerText.length === text.length && lowerNeedle.length === needle.length;
  const haystack = caseless ? lowerText : text;
  const target = caseless ? lowerNeedle : needle;

  const parts: ReactNode[] = [];
  let cursor = 0;
  for (let found = haystack.indexOf(target); found !== -1; found = haystack.indexOf(target, cursor)) {
    if (found > cursor) parts.push(text.slice(cursor, found));
    parts.push(
      <mark key={found} className="bg-warning/25 text-foreground rounded-sm px-0.5">{text.slice(found, found + target.length)}</mark>,
    );
    cursor = found + target.length;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
};
