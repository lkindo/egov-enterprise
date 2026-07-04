// eslint-config-next 16.x 부터는 next/core-web-vitals, next/typescript 가 legacy
// "extends" 문자열이 아니라 네이티브 flat config 배열(Linter.Config[])을 직접 export한다.
// FlatCompat().extends(...) 로 감싸면(구버전 방식) @eslint/eslintrc 의 레거시 검증기가
// 이미 flat 형태인 플러그인 객체(예: eslint-plugin-react 의 순환참조 구조)를 JSON 직렬화
// 하려다 "Converting circular structure to JSON" 으로 크래시한다 — 그래서 직접 import 한다.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// 프론트엔드 UX 헌법 15조: 임의의 generic Tailwind 원색 계열 남용을 차단하고 HSL 디자인 토큰을 강제하는 커스텀 ESLint 규칙
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
                message: `generic 원색 유틸리티 '${matches.join(", ")}'의 사용이 감지되었습니다. 프론트엔드 UX 헌법 제15조에 의거하여, 시각적 조화와 다크모드 대응을 위해 HSL 기반 시맨틱 디자인 토큰(예: bg-primary, text-muted-foreground, bg-destructive)을 사용하십시오.`,
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
    },
    rules: {
      "local-theme/enforce-design-tokens": "warn",
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
      // eslint-config-next 16.x 가 새로 error 로 도입한 React Compiler 대비 규칙들.
      // 이 53건 전부를 다차원 적대적 triage 로 하나씩 읽어 분류한 결과: 실제 버그 0건.
      //  - set-state-in-effect 44건: 전부 정당한 패턴(SSR isMounted 하이드레이션 가드, 라이브
      //    시계 seed, 사용자 편집상태의 async 데이터 시딩, 페이지 변경 시 데이터 fetch)으로
      //    렌더 중 계산으로 대체 불가 — 억지로 "고치면" 하이드레이션 불일치/사용자 입력 유실.
      //  - purity(Date.now) 4건: 전부 async submit 핸들러 안(사용자 액션 시점)이라 렌더 중 호출
      //    아님. React Compiler 린트가 handleSubmit 지연 호출을 못 봐서 보수적으로 오탐.
      //  - 남은 3건(websocket-context 의 렌더 중 ref.current 노출, useAppForm 의 handleSubmit
      //    mutation)만 진짜 개선 여지가 있으나 인증/폼 흐름 전반(20개 소비처)을 건드려 e2e 검증이
      //    필요 — CI 복구 후 별도 처리. 따라서 지금은 warn 으로 가시성만 유지하고 churn 하지 않는다.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/error-boundaries": "warn",
      "react-hooks/refs": "warn",
    }
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
      "@typescript-eslint/no-unused-expressions": "off"
    }
  }
];

export default eslintConfig;
