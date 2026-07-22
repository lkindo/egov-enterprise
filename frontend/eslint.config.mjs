import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

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
    // 불투명 흰 배경(`bg-white`) 탐지 — 다크 테마에서 `--foreground: 210 40% 98%`(흰 글자) 위에 얹혀 대비 ~1.05:1 로 판독 불가가 된다.
    // design-tokens.md R1: 불투명 흰 배경 → `bg-card`, 의도적 다크 서피스 → `bg-surface-inverse`.
    // 반투명 오버레이(`bg-white/10`, `bg-white/80` …)는 의도된 표현이므로 negative lookahead `(?!\/)` 로 제외한다.
    const OPAQUE_WHITE_REGEX = /\bbg-white\b(?!\/)/g;

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
    // 접근성 정적 게이트(감사 P1-10): 아이콘 전용 버튼 aria-label 누락 66건 + onClick 만 달린 비인터랙티브 div 7건
    // (특히 OnlinePollParticipateClient 는 키보드만으로 투표를 완료할 수 없다)의 재발을 차단한다.
    //
    // 플러그인 등록 주의: 'jsx-a11y' 는 eslint-config-next(dist/index.js: plugins['jsx-a11y'])가 이미 등록한다.
    // ESLint 9 flat config 는 동일 네임스페이스를 다른 객체로 재등록하면 "Cannot redefine plugin" 으로 크래시하므로,
    // 여기서는 import·plugins 재선언 없이 규칙만 켠다. (package.json 에는 명시적 devDependency 로 고정해 전이 의존 이탈을 막는다)
    //
    // ⚠ severity 가 'warn' 인 이유: 세 규칙을 error 로 켜면 기존 위반 66건+ 이 즉시 린트를 빨갛게 만들어
    // `pnpm lint` 게이트가 통과 불가가 되고, 그 압력은 결국 규칙 비활성화(=게이트 무력화)로 귀결된다.
    // 목적은 "기존 부채 일괄 차단"이 아니라 "신규 위반 유입 차단"이므로 repo 규범(warn 기반, react-hooks 완화 선례와 동일)에 맞춰 warn 으로 시작한다.
    // TODO(a11y): 기존 위반 정리(감사 P1-10 배치) 완료 후 아래 3개 규칙을 "error" 로 승격할 것.
    files: ["**/*.jsx", "**/*.tsx"],
    rules: {
      // 아이콘 전용 버튼(수정/삭제 ⋮ 등)에 접근 가능한 이름이 없는 경우 — 스크린리더에서 전부 "버튼"으로 읽혀 오삭제 위험
      "jsx-a11y/control-has-associated-label": "warn",
      // onClick 만 있고 키보드 핸들러가 없는 요소 — 키보드 사용자가 조작 자체를 완료할 수 없음
      "jsx-a11y/click-events-have-key-events": "warn",
      // div/span 등 비인터랙티브 요소에 마우스 핸들러만 부착 — button/role 로 승격 필요
      "jsx-a11y/no-static-element-interactions": "warn",
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
