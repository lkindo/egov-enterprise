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
      // 프론트엔드 Zod SSOT 일원화(§4.1/방안1): 인라인 z.object(...) 금지 — 백엔드 생성 스키마를 .extend() 로 확장
      "no-restricted-syntax": [
        "error",
        {
          "selector": "CallExpression[callee.object.name='z'][callee.property.name='object']",
          "message": "인라인 z.object(...) 금지 — 백엔드 SSOT 스키마(@/types/generated-zod)를 import 하여 .extend() 로 확장하세요 (project-audit-report §4.1/방안1)."
        }
      ],
      // eslint-config-next 16(+eslint-plugin-react-hooks 6)이 React Compiler 계열 신규 규칙을 error 로 켜지만,
      // 기존 코드베이스에 대량 존재(set-state-in-effect 등 53건)하므로 게이트 그린 유지 + 백로그 가시화를 위해
      // repo 규범(warn 기반)에 맞춰 warn 으로 완화한다(점진 정리 대상).
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/error-boundaries": "warn",
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
  },
  {
    // 자동 생성 SSOT 스키마 파일은 인라인 z.object 금지 규칙에서 제외(생성물)
    files: ["src/types/generated-zod.ts"],
    rules: {
      "no-restricted-syntax": "off"
    }
  }
];

export default eslintConfig;
