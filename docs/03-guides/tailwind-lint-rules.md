# 🎨 Tailwind 4.0 & HSL 디자인 토큰 ESLint 린터 플러그인 가이드

본 문서는 **eGov Enterprise 프론트엔드 디자인 및 UX 헌법 제6조 (디자인 토큰 준수)** 및 **제15조 (하이브리드 다크/라이트 모드 대비 무결성) 2항 — 시맨틱 컬러 토큰 사용 의무**를 자동 강제하기 위해 개발 및 이식된 **로컬 테마 ESLint 린터 플러그인**의 구조와 사용 가이드에 대해 설명합니다.

---

## 1. 개요 및 헌법 수호 맥락 (Styling Governance)

* **배경**: 엔터프라이즈 환경에서 일관되지 않은 plain generic 원색(예: bg-red-500, text-blue-600)의 남용은 시스템의 전반적인 미관을 단순하게( generic AI aesthetics) 만들며, 다크모드 대응을 차단합니다.
* **해결책**: HSL 디자인 토큰과 테마 시스템(`bg-primary`, `text-muted-foreground`, HSL CSS variables 등)을 준수하도록 유도하는 커스텀 ESLint 정적 분석 플러그인을 탑재하여, 코드 품질 및 디자인 일관성을 실시간 감시합니다.
* **목표**: 8대 독점 스킬인 **`Visual Auditor`**와 시너지 효과를 내어 UX 헌법 제6조(디자인 토큰 준수)·제15조 2항(시맨틱 컬러 토큰) 규범의 영구 수호를 달성합니다.

---

## 2. 린터 규칙 아키텍처 및 설정

Next.js Flat Config (`eslint.config.mjs`) 내부에 정교한 AST 파서 기반의 **`local-theme/enforce-design-tokens`** 커스텀 정적 분석 엔진을 탑재했습니다.

### 2.1 적용된 린터 규칙 명세 ([`eslint.config.mjs`](../../frontend/eslint.config.mjs))
```javascript
// 프론트엔드 UX 헌법 제15조 2항(시맨틱 컬러 토큰 사용 의무)·제6조(디자인 토큰 준수): 임의의 generic Tailwind 원색 계열 남용을 차단하고 HSL 디자인 토큰을 강제하는 커스텀 ESLint 규칙
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
    // bg-red-500, text-blue-600 등 임의의 원색 유틸리티 탐지 정규식
    const BANNED_COLORS_REGEX = /\b(bg|text|border|ring)-(red|blue|green|yellow|orange|purple|pink|indigo|teal)-([1-9]00)\b/g;

    return {
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
            const matches = classNames.match(BANNED_COLORS_REGEX);
            if (matches && matches.length > 0) {
              context.report({
                node,
                message: `generic 원색 유틸리티 '${matches.join(", ")}'의 사용이 감지되었습니다. 프론트엔드 UX 헌법 제15조 2항(시맨틱 컬러 토큰)에 의거하여, 시각적 조화와 다크모드 대응을 위해 HSL 기반 시맨틱 디자인 토큰(예: bg-primary, text-muted-foreground, bg-destructive)을 사용하십시오.`,
              });
            }
          }
        }
      },
    };
  },
};
```

---

## 3. 스타일 패턴 분석 (Styling Patterns)

개발 시 린터에 의해 탐지 및 교정 대상이 되는 대표적 안티 패턴과 올바른 권장 패턴 예시는 다음과 같습니다.

### 🔴 안티 패턴 (Banned Styles - Generic Colors)
* **generic 원색의 남용 (UX 헌법 위반)**:
  ```tsx
  <div className="bg-red-500 text-white p-4">경고 알림</div>
  <button className="bg-blue-600 hover:bg-blue-700 text-white">확인</button>
  <span className="text-green-500">정상 상태</span>
  ```

### 🟢 권장 패턴 (Approved Styles - Semantic HSL Tokens)
* **HSL 테마 기반 시맨틱 디자인 토큰 적용 (UX 헌법 수호)**:
  ```tsx
  // 1. 시맨틱 의미론적 디자인 토큰 사용
  <div className="bg-destructive text-destructive-foreground p-4">경고 알림</div>
  <button className="bg-primary hover:bg-primary/90 text-primary-foreground">확인</button>
  <span className="text-emerald-600">정상 상태</span>
  
  // 2. 글래스모피즘 또는 복합 조화 팔레트 사용
  <div className="bg-white/40 backdrop-blur-xl border border-slate-100/50 shadow-xl">
    프리미엄 컴포넌트
  </div>
  ```

---

## 4. 실전 진단 및 개발 활용법

개발 도중 언제든지 터미널에서 전체 프론트엔드 소스 코드를 대상으로 테마 규격 및 헌법 적합성 자가 진단을 수행할 수 있습니다.

```bash
# 1. 프론트엔드 폴더로 진입
cd frontend

# 2. 정적 스타일 분석 린터 구동
npm run lint
```

본 린터 규칙은 코드를 강제로 컴파일 에러 상태로 만들지 않는 **`warn` 레벨**로 동작하여, 개발의 신속한 유연성을 저해하지 않으면서도 IDE(VS Code 등) 상에서 실시간 경보 물결 밑줄을 제공하여 디자인 부채를 완벽하게 방지합니다.

---
*Governed by: Frontend UX Constitution — Article 6 (Design Tokens) & Article 15 cl.2 (Semantic Color Tokens)*
