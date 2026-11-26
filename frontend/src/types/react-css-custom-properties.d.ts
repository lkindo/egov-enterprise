import 'react';

/**
 * CSS 사용자 정의 속성(`--이름`)을 인라인 스타일에 쓸 수 있게 한다. React 의 CSSProperties 는 이 키를 모르므로, 테마 토큰을
 * 미리보기 영역에만 입히는 화면(layout-theme.buildTokenVars)이 이중 단언으로 덮어 왔다(2026-11-26 품질 평가 PR-3b 에서 걷음).
 */
declare module 'react' {
  interface CSSProperties {
    [customProperty: `--${string}`]: string | number | undefined;
  }
}
