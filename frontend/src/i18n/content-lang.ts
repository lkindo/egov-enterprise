/**
 * 번역하지 않는 고유 문구(사이트 정체 — 기관·제품 이름, 한국어로만 제공하는 화면으로 가는 링크 이름)의 언어 표지(ADR-0063 결정 6).
 * 한글이 들었으면 `ko` 를 돌려 그 요소에 `lang="ko"` 를 단다 — 영어 화면에서도 보조기술이 한국어로 읽는다. 한국어 화면에서는 문서
 * 언어와 같아 덧붙는 의미가 없다.
 */
export function contentLang(text: string): 'ko' | undefined {
  return /[가-힣]/.test(text) ? 'ko' : undefined;
}
