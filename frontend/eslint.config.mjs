/*
  [2026-10-06] 잔여 경고의 성격 — package.json 의 `--max-warnings` 와 함께 읽는다.
  [2026-11-11] 실측 0건(상한 0): react-hooks/refs · set-state-in-effect · no-location-assign 전량 해소.

  새 경고는 `--max-warnings 0` 과 `config/governance/gates.json`(`QUALITY-FRONTEND-LINT-WARNINGS`, 상한 0)에서 즉시 red 가 된다:
  - 폼 제출 핸들러는 이벤트 핸들러(`(event) => { void form.handleSubmit(fn)(event); }`)로 감싸 렌더 단계 ref 평가 경고를 만들지 않는다.
  - 비동기 조회 시작 상태 전이는 이벤트 핸들러/초기 상태와 비동기 완료 구간으로 분리하고, 외부 저장소 복원은 `useSyncExternalStore`(SSR snapshot `null`)를 쓴다.
  - 인증 만료·오류 바운더리의 의도된 전체 페이지 재적재는 `hardNavigateToInternalRoute`(`src/lib/navigation/internal-route.ts`) 동일 출처 경계를 거친다.
*/
import { readFileSync } from "node:fs";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// 프론트엔드 UX 헌법 제15조 2항(시맨틱 컬러 토큰 사용 의무)·제6조(디자인 토큰 준수): 임의의 generic Tailwind 원색 계열 남용을 차단하고 HSL 디자인 토큰을 강제하는 커스텀 ESLint 규칙
//
// [2026-11-18 DEC-OPS-420] 팔레트 원색 판정은 이 규칙 하나다. 종전에는 className 의 일부 원색만 여기서 막고, 나머지(상태색·중립·브랜드
//   액센트, cva 변형·조건식의 문자열)는 vitest 가드 두 개(status-color-guard·hardcoded-color-guard)가 파일별 동결표로 셌다 — 같은 불변식이
//   두 곳에 있었고 줄이거나 옮길 때마다 표를 손으로 고쳤다. 이제 화면을 그리는 생산 소스(.tsx/.jsx, 시험 제외)의 모든 문자열·정규식을 본다.
//   남은 동결분은 그 줄 바로 위의 동결 표지 `palette-frozen: <원색 클래스…> -- <사유>`(// 또는 {/* */} 주석)로 남는다. 표지는 그 줄에서
//   허용한 클래스와 개수만 푼다 — 같은 줄에 새 원색을 더하면 붉고, 고쳐서 사라진 클래스가 표지에 남아도 붉다(표지가 스스로 정확해진다).
//   이 규칙을 eslint-disable 주석으로 끄지 않는다(eslint-palette-color.test.ts 가 생산 소스에서 막는다) — 불투명 흰 배경 검사까지 함께 꺼진다.
const PALETTE_UTILITIES = "text|bg|border|ring|divide|from|to|via|placeholder|fill|stroke|shadow|ring-offset|caret|outline|decoration|accent";
// 상태(성공·경고·오류) 계열과 중립·브랜드 액센트 계열 — 두 가드의 합집합이 전 팔레트였다.
const STATUS_COLORS = "red|green|emerald|rose|amber|orange|yellow|lime|pink";
const NEUTRAL_AND_BRAND_COLORS = "slate|gray|zinc|neutral|stone|blue|indigo|sky|violet|purple|cyan|teal|fuchsia";
const PALETTE_SOURCE = `(?:${PALETTE_UTILITIES})-(?:${STATUS_COLORS}|${NEUTRAL_AND_BRAND_COLORS})-[0-9]{2,3}(?:\\/[0-9]{1,3})?`;
const PALETTE_REGEX = new RegExp(PALETTE_SOURCE, "g");
const PALETTE_CLASS = new RegExp(`^${PALETTE_SOURCE}$`);
const FROZEN_MARK = /^\s*palette-frozen:\s*(.*?)\s*(?:--\s*(.*?))?\s*$/s;
const PALETTE_GUIDE = "프론트엔드 UX 헌법 제15조 2항(시맨틱 컬러 토큰)에 의거하여 시맨틱 토큰을 쓰십시오 — 성공·경고·오류·정보는 success/warning/destructive(-emphasis)/info, 분류 표식은 hub-*, 중립은 foreground·muted·border 계열(docs/03-guides/design-tokens.md).";

// [2026-11-26 PR-3b 6번] 정의되지 않은 시맨틱 상태색. `text-warning-emphasis` 처럼 globals.css 의 @theme 에 `--color-<이름>` 이 없는
//   이름은 Tailwind 가 클래스를 만들지 않아 색이 조용히 빠진다 — 두 파일 주석이 함정으로 적어 두었는데도 17개 파일 21곳이 그 클래스를
//   썼다(경고 글자가 본문색으로 보였다). 허용 목록은 @theme 에서 읽으므로 토큰을 정의하면 그대로 풀린다.
//   유틸리티를 만드는 것은 @theme 블록의 선언뿐이다 — 주석 안(퇴역시킨 토큰)이나 :root 의 --color-* 는 정의가 아니다. 방향 테두리
//   (border-t-…·논리 방향 border-bs-…)와 숫자 단계(bg-warning-500)도 같은 함정이고, 화면 클래스를 담는 .ts 색상표도 본다.
/**
 * CSS 의 `@theme …{ … }` 블록에서 **맨 위 단계** 선언만 순서대로 이어 붙인다. 블록 안의 `@keyframes { to { --color-x: … } }` 같은
 * 중첩 본문은 지역 선언이라 유틸리티를 만들지 않는다.
 */
const themeTopLevel = (css) => {
  const parts = [];
  for (const match of css.matchAll(/@theme\b[^{]*\{/g)) {
    let depth = 1;
    for (let index = match.index + match[0].length; index < css.length && depth > 0; index += 1) {
      const char = css[index];
      if (char === "{") depth += 1;
      else if (char === "}") depth -= 1;
      else if (depth === 1) parts.push(char);
    }
    parts.push("\n");
  }
  return parts.join("");
};
/** 선언 순서대로 적용한다 — 뒤의 `--color-*: initial` 은 앞의 색을 모두, `--color-x: initial` 은 그 색을 지운다. */
const themeColorNames = (css) => {
  const names = new Set();
  for (const [, name, value] of themeTopLevel(css).matchAll(/--color-([a-z0-9-]+|\*)\s*:\s*([^;]*);/g)) {
    const reset = value.trim() === "initial";
    if (name === "*") {
      if (reset) names.clear();
    } else if (reset) names.delete(name);
    else names.add(name);
  }
  return names;
};
const THEME_COLOR_NAMES = themeColorNames(
  readFileSync(new URL("./src/app/globals.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, ""),
);
const SEMANTIC_STATUS_REGEX = new RegExp(
  `(?<![\\w-])(?:${PALETTE_UTILITIES}|border-(?:[xytrblse]|bs|be))-((?:success|warning|info|destructive|primary)(?:-[a-z0-9]+)*)(?:\\/[0-9]{1,3})?(?![\\w-])`,
  "g",
);
/** 미정의 시맨틱 색 판정 범위 — 시험을 뺀 생산 소스 전부(.ts 색상표 포함). */
const isProductionSource = (filename) => {
  const path = filename.replaceAll("\\", "/");
  return /\/src\//.test(path) && /\.(?:tsx|jsx|ts)$/.test(path) && !path.includes("/__tests__/") && !/\.test\./.test(path);
};

/** 팔레트 판정 범위 — 화면을 그리는 생산 소스. 시험과 `__tests__` 는 빼고, .ts 는 화면 문자열을 갖지 않아 종전 가드도 세지 않았다. */
const isRenderedProductionSource = (filename) => {
  const path = filename.replaceAll("\\", "/");
  return /\.(?:tsx|jsx)$/.test(path) && !path.includes("/__tests__/") && !/\.test\./.test(path);
};

const enforceDesignTokensRule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Enforce curated design tokens instead of generic Tailwind colors",
      category: "Styling",
      recommended: true,
    },
    schema: [],
  },
  create(context) {
    // 불투명 흰 배경(`bg-white`) 탐지 — 다크 테마에서 `--foreground: 210 40% 98%`(흰 글자) 위에 얹혀 대비 ~1.05:1 로 판독 불가가 된다.
    // design-tokens.md R1: 불투명 흰 배경 → `bg-card`, 의도적 다크 서피스 → `bg-surface-inverse`.
    // 반투명 오버레이(`bg-white/10`, `bg-white/80` …)는 의도된 표현이므로 negative lookahead `(?!\/)` 로 제외한다.
    const OPAQUE_WHITE_REGEX = /\bbg-white\b(?!\/)/g;
    const paletteScope = isRenderedProductionSource(context.filename);
    /** 줄 번호 → 그 줄에서 시작하는 노드와 그 노드의 팔레트 원색(등장 순서·중복 그대로). */
    const paletteByLine = new Map();

    const semanticScope = isProductionSource(context.filename);
    const collectPalette = (node, text) => {
      if (typeof text !== "string") return;
      if (semanticScope) reportUndefinedSemantic(node, text);
      if (!paletteScope) return;
      const matches = text.match(PALETTE_REGEX);
      if (!matches) return;
      const line = node.loc.start.line;
      if (!paletteByLine.has(line)) paletteByLine.set(line, []);
      paletteByLine.get(line).push({ node, matches });
    };

    function reportUndefinedSemantic(node, text) {
      const undefinedNames = [...text.matchAll(SEMANTIC_STATUS_REGEX)]
        .map((match) => match[1])
        .filter((name) => !THEME_COLOR_NAMES.has(name));
      if (undefinedNames.length > 0) {
        context.report({
          node,
          message: `정의되지 않은 시맨틱 색 '${[...new Set(undefinedNames)].join(", ")}' — globals.css @theme 에 --color-<이름> 이 없어 Tailwind 가 클래스를 만들지 않는다(색이 조용히 빠진다). 정의된 토큰을 쓰거나, 경고·정보는 틴트(bg-warning/15·Badge warning-soft)와 text-foreground 로 말한다.`,
        });
      }
    }

    /** 동결 표지: 다음 줄 번호 → { comment, allowed(다중 집합), reason } */
    const frozenMarks = () => {
      const marks = new Map();
      for (const comment of context.sourceCode.getAllComments()) {
        const mark = FROZEN_MARK.exec(comment.value);
        if (!mark) continue;
        const tokens = mark[1].split(/\s+/).filter(Boolean);
        const invalid = tokens.filter((token) => !PALETTE_CLASS.test(token));
        if (!paletteScope || tokens.length === 0 || invalid.length > 0 || !mark[2]) {
          context.report({
            loc: comment.loc,
            message: `동결 표지 'palette-frozen:' 이 잘못됐습니다 — 화면 생산 소스(.tsx/.jsx)에서 다음 줄의 팔레트 원색 클래스만 공백으로 나열하고 ' -- <사유>' 를 붙인다${invalid.length ? `(원색 클래스가 아닌 항목: ${invalid.join(", ")})` : ""}.`,
          });
          continue;
        }
        marks.set(comment.loc.end.line + 1, { comment, allowed: tokens });
      }
      return marks;
    };

    return {
      Literal(node) {
        collectPalette(node, typeof node.value === "string" ? node.value : node.regex?.pattern);
      },
      TemplateElement(node) {
        collectPalette(node, node.value.raw);
      },
      JSXText(node) {
        collectPalette(node, node.value);
      },
      "Program:exit"() {
        const marks = frozenMarks();
        for (const [line, entries] of paletteByLine) {
          const remaining = [...(marks.get(line)?.allowed ?? [])];
          for (const { node, matches } of entries) {
            const unfrozen = matches.filter((match) => {
              const at = remaining.indexOf(match);
              if (at < 0) return true;
              remaining.splice(at, 1);
              return false;
            });
            if (unfrozen.length === 0) continue;
            context.report({
              node,
              message: `팔레트 원색 '${unfrozen.join(", ")}'의 사용이 감지되었습니다. ${PALETTE_GUIDE} 데이터 시각화처럼 팔레트가 정말 필요한 자리는 그 줄 바로 위에 'palette-frozen: <클래스…> -- <사유>' 표지를 둔다.`,
            });
          }
          if (marks.has(line) && remaining.length > 0) {
            context.report({
              loc: marks.get(line).comment.loc,
              message: `동결 표지의 '${remaining.join(", ")}' 이(가) 다음 줄에 없습니다 — 고쳤으면 표지에서 지운다.`,
            });
          }
          marks.delete(line);
        }
        for (const { comment, allowed } of marks.values()) {
          context.report({
            loc: comment.loc,
            message: `동결 표지의 '${allowed.join(", ")}' 이(가) 다음 줄에 없습니다 — 고쳤으면 표지를 지운다.`,
          });
        }
      },
      JSXAttribute(node) {
        if (node.name.name === "className") {
          let classNames = "";
          if (node.value && node.value.type === "Literal" && typeof node.value.value === "string") {
            classNames = node.value.value;
          } else if (
            node.value &&
            node.value.type === "JSXExpressionContainer" &&
            node.value.expression.type === "TemplateLiteral"
          ) {
            classNames = node.value.expression.quasis.map(q => q.value.raw).join(" ");
          }

          if (classNames) {
            const whiteMatches = classNames.match(OPAQUE_WHITE_REGEX);
            if (whiteMatches && whiteMatches.length > 0) {
              context.report({
                node,
                message: `불투명 'bg-white' 사용이 감지되었습니다. 다크 모드에서 흰 배경 위에 흰 글자(대비 ~1.05:1)가 되어 판독이 불가능해집니다. docs/03-guides/design-tokens.md R1 에 따라 'bg-card'(불투명 흰 배경) 또는 'bg-surface-inverse'(의도적 다크 서피스)로 교체하십시오. 반투명 오버레이가 필요하면 'bg-white/80' 형태를 사용하십시오.`,
              });
            }
          }
        }
      },
    };
  },
};

const localThemePlugin = {
  rules: {
    "enforce-design-tokens": enforceDesignTokensRule,
  },
};

// [2026-10-27] mutationFn 이 렌더 상태를 클로저로 읽지 못하게 한다.
//
// TanStack Query v5 의 useMutation 은 옵션을 패시브 이펙트(observer.setOptions)에서 갱신한다. 렌더는 커밋됐지만
// 이펙트가 아직 흐르지 않은 순간에 저장을 누르면 mutationFn 은 한 렌더 전의 클로저다 — 화면은 새 상태인데 요청은
// 직전 상태를 보낸다. 전체 교체 저장이면 실패가 아니라 "롤이 하나도 없는 권한" 같은 성공으로 끝나 아무도 모른다
// (2026-09 권한 매핑 저장 본문 [] 간헐 실패, 75e7ef349 에서 mutate(variables) 로 고침).
// 그래서 같은 컴포넌트의 useState·useReducer 상태값을 mutationFn 이 읽으면 막는다. setter·props·경로 값은 보지 않는다.
// 한계: mutationFn 에 미리 만든 함수(`mutationFn: save`)를 넘기거나 상태에서 파생한 값(useMemo)을 읽으면 보지 못한다.
const STATE_HOOKS = new Set(["useState", "useReducer"]);

function hookName(callee) {
  if (callee.type === "Identifier") return callee.name;
  if (callee.type === "MemberExpression" && !callee.computed && callee.property.type === "Identifier") return callee.property.name;
  return null;
}

function isRenderState(variable) {
  const def = variable.defs[0];
  if (!def || def.type !== "Variable" || def.node.type !== "VariableDeclarator") return false;
  const { id, init } = def.node;
  if (!init || init.type !== "CallExpression" || !STATE_HOOKS.has(hookName(init.callee))) return false;
  if (id.type !== "ArrayPattern") return false;
  const first = id.elements[0];
  const binding = first?.type === "AssignmentPattern" ? first.left : first;
  return binding?.type === "Identifier" && binding.name === variable.name;
}

const noRenderStateInMutationFnRule = {
  meta: {
    type: "problem",
    docs: { description: "mutationFn must take its payload from mutate(variables), not from render state" },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        if (hookName(node.callee) !== "useMutation") return;
        const options = node.arguments[0];
        if (!options || options.type !== "ObjectExpression") return;
        const property = options.properties.find(
          (p) => p.type === "Property" && !p.computed && p.key.type === "Identifier" && p.key.name === "mutationFn",
        );
        const fn = property?.value;
        if (!fn || (fn.type !== "ArrowFunctionExpression" && fn.type !== "FunctionExpression")) return;
        const reported = new Set();
        for (const reference of context.sourceCode.getScope(fn).through) {
          const variable = reference.resolved;
          if (!variable || reported.has(variable) || !isRenderState(variable)) continue;
          reported.add(variable);
          context.report({
            node: reference.identifier,
            message: `mutationFn 이 렌더 상태 '${variable.name}' 를 클로저로 읽습니다 — useMutation 은 옵션을 이펙트에서 갱신하므로 저장 직전 클릭에 한 렌더 전 값이 나갑니다. 값을 mutate(variables) 로 넘기고 mutationFn 의 매개변수로 받으세요.`,
          });
        }
      },
    };
  },
};

const localQueryPlugin = {
  rules: {
    "no-render-state-in-mutation-fn": noRenderStateInMutationFnRule,
  },
};

// eslint-config-next 16 은 네이티브 flat config 배열을 export 한다. (ESLint 9 + next 16)
// 이전의 FlatCompat("next/core-web-vitals", "next/typescript") 방식은 @eslint/eslintrc 검증기에서
// 순환 구조 크래시를 일으켜, 네이티브 flat config 직접 spread 로 전환한다.
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    plugins: {
      "local-theme": localThemePlugin,
      "local-query": localQueryPlugin,
    },
    rules: {
      // [2026-11-10] warn → error. 헌법 제15조 2항의 의무인데 위반이 0건이 된 뒤에도 경고였다 — 새 위반이 경고 상한(19)을
      //   차지하며 통과할 수 있었다. 게이트 원장(QUALITY-FRONTEND-DESIGN-TOKEN-SEVERITY)의 기준도 error 로 올려 되돌리면 붉다.
      "local-theme/enforce-design-tokens": "error",
      "local-query/no-render-state-in-mutation-fn": "error",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "caughtErrorsIgnorePattern": "^_"
        }
      ],
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "react/no-unescaped-entities": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      // 프론트엔드 Zod SSOT 일원화(§4.1/방안1): 인라인 z.object(...) 금지 — 백엔드 생성 스키마를 .extend() 로 확장
      //
      // [2026-10-18] 손으로 쓴 탭 목록 금지 — role="tablist"·"tab"·"tabpanel" 은 standard-tabs.tsx 의 TabList·Tab·TabPanel 로만
      // 만든다(roving tabindex·방향키·Home/End·aria-controls 를 한 곳에서 갖는다). 손으로 만든 탭 목록 15곳 중 방향키가 되는
      // 곳은 둘이었다. 옮길 수 없는 자리는 그 줄에 `eslint-disable-next-line no-restricted-syntax -- <사유>` 를 단다 — 위반이
      // 사라진 예외 주석은 쓰이지 않은 지시어 경고가 되어 --max-warnings 상한에 걸린다(예외 목록이 정확하게 유지된다).
      "no-restricted-syntax": [
        "error",
        {
          "selector": "CallExpression[callee.object.name='z'][callee.property.name='object']",
          "message": "인라인 z.object(...) 금지 — 백엔드 SSOT 스키마(@/types/generated-zod)를 import 하여 .extend() 로 확장하세요 (project-audit-report §4.1/방안1)."
        },
        // 입력 컨트롤의 경계는 3:1 을 보장한 border-input 이다. border-border 나 색 없는 border 는 다시 보이지 않게 된다(WCAG 1.4.11).
        {
          "selector": "JSXOpeningElement[name.name=/^(input|select|textarea|Input|Textarea|SelectTrigger|NativeSelect|Checkbox|Switch)$/] > JSXAttribute[name.name='className'] Literal[value=/(^|\\s)([^\\s]*:)?border-border(\\/\\d+)?(\\s|$)/]",
          "message": "입력 컨트롤의 경계는 인접 면 대비 3:1 을 보장한 border-input 을 쓰세요(status-token-contrast 계약)."
        },
        {
          "selector": "JSXOpeningElement[name.name=/^(input|select|textarea|Input|Textarea|SelectTrigger|NativeSelect|Checkbox|Switch)$/] > JSXAttribute[name.name='className'] TemplateElement[value.raw=/(^|\\s)([^\\s]*:)?border-border(\\/\\d+)?(\\s|$)/]",
          "message": "입력 컨트롤의 경계는 인접 면 대비 3:1 을 보장한 border-input 을 쓰세요(status-token-contrast 계약)."
        },
        {
          "selector": "JSXOpeningElement[name.name=/^(input|select|textarea)$/] > JSXAttribute[name.name='className'] Literal[value=/^(?!.*border-input)(.*\\s)?border(\\s.*)?$/]",
          "message": "입력 컨트롤의 경계는 인접 면 대비 3:1 을 보장한 border-input 을 쓰세요(status-token-contrast 계약)."
        },
        {
          "selector": "JSXOpeningElement[name.name=/^(input|select|textarea)$/] > JSXAttribute[name.name='className'] TemplateElement[value.raw=/^(?!.*border-input)(.*\\s)?border(\\s.*)?$/]",
          "message": "입력 컨트롤의 경계는 인접 면 대비 3:1 을 보장한 border-input 을 쓰세요(status-token-contrast 계약)."
        },
        {
          "selector": "VariableDeclarator[id.name=/(INPUT|SELECT|TEXTAREA).*CLASS/] Literal[value=/(^|\\s)([^\\s]*:)?border-border(\\/\\d+)?(\\s|$)/]",
          "message": "입력 컨트롤의 경계는 인접 면 대비 3:1 을 보장한 border-input 을 쓰세요(status-token-contrast 계약)."
        },
        {
          "selector": "JSXAttribute[name.name='role'] Literal[value=/^tab(list|panel)?$/]",
          "message": "손으로 쓴 탭 역할 금지 — @/app/components/ui/standard-tabs 의 TabList·Tab·TabPanel 을 쓰세요(방향키·roving tabindex·aria-controls 를 갖춘 탭 원천)."
        },
        // [2026-11-26 품질 평가 PR-3b 6번] 날 select 금지 — 모양·초점 고리·오류 표시를 한 곳에서 갖는 NativeSelect(@/components/ui/native-select)를
        //   쓴다. 화면마다 높이·배경·초점 고리를 따로 적던 46곳을 옮겼다.
        {
          "selector": "JSXOpeningElement[name.name='select']",
          "message": "날 <select> 금지 — @/components/ui/native-select 의 NativeSelect 를 쓰세요(기본 모양·초점 고리·aria-invalid 표시를 갖춘 디자인 시스템 래퍼). 화면은 폭·배치만 덧붙입니다."
        },
        // [2026-11-26 품질 평가 PR-3b] 이중 단언(`x as unknown as T`)은 두 타입의 차이(선택·필수, 없는 필드)를 통째로 숨긴다 — 제품 코드의 13건 중
        //   12건을 실제 값 확인·변환 함수·타입 정렬로 걷었다. 표현할 수 없는 라이브러리 경계(폼 resolver 1건)만 그 줄에 사유를 단 예외 주석을 둔다.
        {
          "selector": "TSAsExpression[expression.type='TSAsExpression'][expression.typeAnnotation.type='TSUnknownKeyword']",
          "message": "이중 단언(as unknown as) 금지 — 타입 가드로 실제 값을 확인하거나, 변환 함수로 바꾸거나, 두 타입을 맞추세요. 표현할 수 없는 라이브러리 경계만 사유를 단 eslint-disable-next-line 으로 둡니다."
        },
        // [2026-11-15] 화면 대기 문구. 기다리는 동안은 '불러오는 중…' 이고, 저장·처리 중은 무엇을 하는지(대상) 붙인다
        //   — '부서 등록 중…', '추천 처리 중…'. '로딩 중'·대상 없는 '처리 중…' 은 화면 용어 검토(GAP-COPY-001)에서 남은 편차였고
        //   5곳을 옮긴 뒤 0건에서 동결한다. 주석·시험·e2e 는 이 블록 밖이다.
        {
          "selector": ":matches(Literal[value=/로딩 중/], JSXText[value=/로딩 중/], TemplateElement[value.raw=/로딩 중/])",
          "message": "'로딩 중' 대신 '불러오는 중…' 을 쓰세요(화면 용어 — 외래어 대신 우리말 동작어)."
        },
        {
          // 식 없는 템플릿 문자열(`처리 중…`)도 본다. 대상을 넣은 `${대상} 처리 중…` 은 식이 있어 걸리지 않는다. 문자열 연결('처리 ' + '중…')은 이 규칙 밖이다.
          "selector": ":matches(Literal[value=/^\\s*처리 중(…|\\.\\.\\.?)?\\s*$/], JSXText[value=/^\\s*처리 중(…|\\.\\.\\.?)?\\s*$/], TemplateLiteral[expressions.length=0] > TemplateElement[value.raw=/^\\s*처리 중(…|\\.\\.\\.?)?\\s*$/])",
          "message": "대상 없는 '처리 중…' 대신 무엇을 하는지 밝히세요 — 예: '부서 등록 중…', '추천 처리 중…'."
        },
        // [2026-11-16] 문구 어미 기준(2026-11-15 사용자 위임 결정): 서술은 합쇼체(~니다), 요청은 '~해 주세요'·'~하세요' 다.
        //   '~하십시오' 는 쓰지 않는다 — 화면 13곳을 옮긴 뒤 0건에서 동결한다(화면과 짝인 백엔드 메시지 4곳은 벤더 증거 재기록 묶음에서 옮긴다, DEC-OPS-417). 주석·시험·e2e 는 이 블록 밖이다.
        {
          "selector": ":matches(Literal[value=/십시오/], JSXText[value=/십시오/], TemplateElement[value.raw=/십시오/])",
          "message": "'~하십시오' 대신 '~해 주세요' 나 '~하세요' 를 쓰세요(화면 문구 어미 기준 — 서술 ~니다, 요청 ~해 주세요·~하세요)."
        },
        // [2026-11-19] console 에 값을 통째로 넘기지 않는다 — axios 오류를 넘기면 config.headers 의 Authorization(Bearer)·
        //   config.params 의 검색어가 그대로 찍힌다(서버 컴포넌트에서 재현, 2026-11-19 평가). 2026-09-05 에 logErrorSafely 를
        //   만들고도 세 곳이 다시 원본 오류를 넘겼다. 배열·전개·??·삼항으로 감싼 값과 globalThis.console 도 같다(Codex 검토).
        //   문자열 리터럴·템플릿·문자열 연결·함수 호출 결과(summarizeError 등)는 걸리지 않는다. 구문만으로는 변수의 타입을 알 수
        //   없어 문자열 변수도 걸린다 — 템플릿 문자열로 넣는다.
        {
          "selector": "CallExpression:matches([callee.object.name='console'], [callee.object.property.name='console']) > :matches(Identifier, MemberExpression, TSAsExpression, TSNonNullExpression, ObjectExpression, ArrayExpression, SpreadElement, LogicalExpression, ConditionalExpression).arguments",
          "message": "console 에 값을 통째로 넘기지 마세요 — 오류는 logErrorSafely(문구, 오류)로, 그 밖의 값은 필요한 필드만 템플릿 문자열로 남기세요(@/lib/safe-error-log)."
        }
      ],
      // [2026-11-11] 전량 해소한 3개 규칙(set-state-in-effect · refs · no-location-assign-relative-destination)은
      //   "error" 로 승격해 --max-warnings 조정이나 부분 비활성화 우회를 차단한다.
      //   나머지 React Compiler 계열(purity · immutability · error-boundaries)은 현재 위반 0건이며 --max-warnings 0 이 지킨다.
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "error",
      "react-hooks/error-boundaries": "warn",
      "@next/next/no-location-assign-relative-destination": "error",
    }
  },
  {
    // 접근성 정적 게이트(감사 P1-10): 아이콘 전용 버튼 aria-label 누락 및 onClick 만 달린 비인터랙티브 div 정리 완료.
    // 재발 방지를 위해 3개 접근성 규칙을 "error" 로 승격한다.
    files: ["**/*.jsx", "**/*.tsx"],
    rules: {
      // 아이콘 전용 버튼(수정/삭제 ⋮ 등)에 접근 가능한 이름이 없는 경우 — 스크린리더에서 전부 "버튼"으로 읽혀 오삭제 위험
      "jsx-a11y/control-has-associated-label": "error",
      // onClick 만 있고 키보드 핸들러가 없는 요소 — 키보드 사용자가 조작 자체를 완료할 수 없음
      "jsx-a11y/click-events-have-key-events": "error",
      // div/span 등 비인터랙티브 요소에 마우스 핸들러만 부착 — button/role 로 승격 필요
      "jsx-a11y/no-static-element-interactions": "error",
    }
  },
  {
    // [2026-09-03] `console.log` 정적 차단 — 배포되는 src 코드에만 적용한다.
    //
    // 왜 필요한가. 이 저장소가 반복해서 걷어낸 결함 유형이 "동작 대신 로그만 남기는 컨트롤"이다.
    // 본문 편집기 툴바 버튼 12개가 전부 `console.log('Applying style: ...')` 하나에 걸려 눌러도
    // 아무 일이 없었고(2026-09-03 수정), DEC-OPS-022 는 `console.log` 뿐인 검색 컨트롤을 같은
    // 이유로 제거했다. 둘 다 사람이 눈으로 발견할 때까지 어떤 게이트도 보지 못했다 —
    // 저장소 전수 검색으로 `no-console`·`removeConsole` 규칙이 0건임을 확인했다.
    //
    // 왜 warn/error 는 허용하는가. 남은 호출 19건은 전부 진단이다(error 12·warn 7). 특히
    // `app/api/security/csp/route.ts` 의 warn 은 **CSP 위반 리포트의 현재 유일한 sink** 이고
    // (known-gaps GAP-FE-001 이 수집 채널 결정 PD-CSP-002 를 대기 중으로 기록한다),
    // `proxy.ts` 의 warn 도 의도적인 서버 경고다. 이것들을 지우는 것은 개선이 아니라 관측 삭제다.
    //
    // 왜 `src/**` 로 좁히는가. `pnpm lint` 의 대상은 `src e2e` 둘 다인데 e2e 에는 러너 진행 로그가
    // `console.log` 로 355건 있다. 전역 적용하면 그 355건이 즉시 `--max-warnings` 캡을 날린다.
    // e2e 의 브라우저 콘솔은 이미 `e2e/fixtures/error-detector.ts` 의 ConsoleErrorGuard 가
    // 만료되는 원장으로 통제하므로 이 규칙이 덮을 축이 아니다.
    //
    // 도입 시점 위반 0건 — src 비테스트 코드의 `console.log` 실호출은 현재 없다.
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: ["src/**/__tests__/**", "src/**/*.test.ts", "src/**/*.test.tsx"],
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
    }
  },
  {
    // [2026-09-30] 토스트는 `useToast`(app/components/ui/toast) 하나로 띄운다.
    //
    // sonner 를 화면이 직접 부르면 두 가지가 빠진다. 문구 정규화를 거치지 않아 전송 원문(`Network Error`)이
    // 사용자 문장 자리에 들어가고, "실패 한 번에 토스트 하나" 규칙(전역 실패 알림을 화면 토스트가 거둬 가는
    // 경로)을 지나지 않아 같은 실패가 두 번 뜬다. 2026-09-30 기준 직접 호출 7곳을 옮기고 0건에서 동결한다.
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: [
      "src/app/components/ui/toast.tsx",
      "src/components/ui/sonner.tsx",
      "src/**/__tests__/**",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
    ],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [{
          name: "sonner",
          message: "sonner 를 직접 부르지 말고 useToast(@/app/components/ui/toast)를 쓰세요 — 문구 정규화와 '실패 1회 = 토스트 1개' 규칙이 그 안에 있습니다.",
        }],
      }],
    },
  },
  {
    // [2026-11-15] 공용 부품·범용 훅의 의존 방향(docs/02-architecture/frontend-design-system.md §5).
    //
    // `src/components/ui` 는 서비스·라우터·인증 문맥을 모르는 기본 부품이고, 화면 공용 조합 부품은 `src/app/components/ui` 다.
    // `src/lib/hooks` 는 화면·업무를 모르는 범용 훅이고, 서비스를 부르는 훅은 `src/hooks` 에 둔다. 이름이 비슷한 두 폴더가
    // 섞이면 기본 부품이 업무 조회를 끌고 들어와 기능을 뺀 구성에서 함께 빠진다. 도입 시점 위반 0건(정적 import 기준).
    // 이 규칙은 `@/…` 별칭 import 만 본다 — 동적 import()·상대 경로·`@/lib/api` 직접 호출(알림 훅 use-notifications)은 밖이다.
    //
    // 같은 규칙 이름을 다시 선언하면 앞 블록의 설정을 덮으므로 sonner 금지를 함께 싣는다.
    files: ["src/lib/hooks/**/*.ts", "src/lib/hooks/**/*.tsx"],
    ignores: [
      "src/**/__tests__/**",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
    ],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [{
          name: "sonner",
          message: "sonner 를 직접 부르지 말고 useToast(@/app/components/ui/toast)를 쓰세요 — 문구 정규화와 '실패 1회 = 토스트 1개' 규칙이 그 안에 있습니다.",
        }],
        patterns: [{
          group: ["@/services/*", "@/hooks/*", "@/queries/*"],
          message: "범용 훅(src/lib/hooks)은 서비스·업무 훅·조회 키를 모릅니다 — 서비스를 부르는 훅은 src/hooks 에 두거나, 조회는 부르는 쪽이 하고 값을 넘기세요.",
        }],
      }],
    },
  },
  {
    // [2026-11-15] 기본 부품은 서비스·조회 키에 더해 라우터·인증 문맥·화면 계층도 모른다(위 블록과 같은 이유). 범용 훅에는
    //   이 세 축을 걸지 않는다 — 알림 훅이 인증·웹소켓 문맥을, 목록 조건 훅이 기간 필터 정의를 읽는다.
    files: ["src/components/ui/**/*.ts", "src/components/ui/**/*.tsx"],
    ignores: [
      "src/components/ui/sonner.tsx",
      "src/**/__tests__/**",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
    ],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [
          {
            name: "sonner",
            message: "sonner 를 직접 부르지 말고 useToast(@/app/components/ui/toast)를 쓰세요 — 문구 정규화와 '실패 1회 = 토스트 1개' 규칙이 그 안에 있습니다.",
          },
          { name: "next/navigation", message: "기본 부품은 라우터를 모릅니다 — 이동은 부르는 쪽이 onClick·href 로 넘기세요." },
        ],
        patterns: [{
          group: ["@/services/*", "@/hooks/*", "@/queries/*", "@/contexts/*", "@/app/*"],
          message: "기본 부품(src/components/ui)은 서비스·업무 훅·조회 키·인증 문맥·화면 계층(@/app)을 모릅니다 — 화면 공용 조합 부품이면 src/app/components/ui 에 두세요.",
        }],
      }],
    },
  },
  {
    files: ["src/services/**/*.ts"],
    rules: {
      "@typescript-eslint/naming-convention": [
        "error",
        {
          "selector": "class",
          "format": ["PascalCase"],
          "suffix": ["Service", "AdminService"]
        }
      ]
    }
  },
  {
    files: ["**/__tests__/**/*", "**/*.test.ts", "**/*.test.tsx", "vitest.setup.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "react-hooks/rules-of-hooks": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      // [2026-08-03] 인라인 z.object 금지는 **애플리케이션 코드의 SSOT 드리프트**를 막는 규칙이다
      //   (백엔드 생성 스키마를 안 쓰고 화면에서 스키마를 새로 쓰면 계약이 갈라진다).
      //   테스트는 배포물이 아니라 계약을 만들지 않으므로 그 위험이 성립하지 않는다. 반면
      //   `useAppForm` 같은 **제네릭 훅**의 단위 테스트는 도메인과 무관한 최소 스키마가 필요하고,
      //   그것을 generated-zod 에서 빌려오면 테스트가 도메인 변경에 불필요하게 결합된다.
      //   ⚠ 범위는 테스트 파일에 한정한다 — 애플리케이션 코드는 계속 error 다(위 §99 블록).
      //   (이 예외가 없어 2026-08-03 CI frontend-build 가 lint 에러 1건으로 red 였고,
      //    그 결과 e2e 22티어가 통째로 skip 됐다.)
      "no-restricted-syntax": "off"
    }
  },
  {
    // 자동 생성 SSOT 스키마 파일은 인라인 z.object 금지 규칙에서 제외(생성물). 진입 파일 옆 같은 이름 폴더의 태그 묶음 모듈도 생성물이다.
    files: [
      "src/types/generated-zod.ts",
      "src/types/generated-operations.ts",
      "src/types/generated-zod/*.ts",
      "src/types/generated-operations/*.ts",
    ],
    rules: {
      "no-restricted-syntax": "off"
    }
  },
  {
    // ────────────────────────────────────────────────────────────────────────
    // [2026-08-11 신설] E2E(Playwright) 디렉터리.
    //
    // 종전 `lint` 스크립트는 `eslint src` 라 **e2e/ 가 통째로 lint 대상 밖**이었다.
    // (같은 이유로 타입 검사도 빠져 있었고, 그쪽은 2026-08-10 tsconfig.e2e.json 으로 메웠다.)
    // 여기서 그 마지막 사각지대를 닫는다.
    //
    // ⚠ `react-hooks/rules-of-hooks` 는 이 디렉터리에서 **전량 오탐**이다.
    //   Playwright 의 fixture API 는 `use` 라는 이름의 콜백 인자를 쓴다:
    //       bbsPage: async ({ page }, use) => { await use(new BBSPage(page)); }
    //   eslint-plugin-react-hooks 가 그 호출을 React 의 `use` 훅으로 오인해
    //   "React Hook \"use\" is called in function \"bbsPage\"…" 를 뱉는다.
    //   실측(2026-08-11): e2e 의 **error 13건이 전부 이 규칙 하나**였고, 모두 base-test.ts 의
    //   fixture 정의였다. e2e/ 에는 React 컴포넌트가 존재하지 않는다 — 규칙의 적용 대상이 아니다.
    //   (이미 `**/__tests__/**`·`*.test.ts` 에 같은 예외가 있는데 `*.spec.ts` 만 빠져 있었다.)
    //
    // 인라인 z.object 금지도 테스트와 같은 이유로 끈다 — E2E 는 배포물이 아니라 계약을 만들지 않는다.
    // ────────────────────────────────────────────────────────────────────────
    files: ["e2e/**/*.ts"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
      "no-restricted-syntax": "off"
    }
  }
];

export default eslintConfig;
