# Design System: eGov Enterprise (Modernized)

## 1. Visual Theme & Atmosphere: "Unified Premium"
본 시스템은 기존의 실용주의적 관리자 UI와 전문적인 프리미엄 대시보드 UI를 하나의 디자인 언어로 통합한 **"Unified Premium"** 전략을 채택합니다. 단순히 시각적 효과를 나열하는 것이 아니라, 작업의 성격(데이터 중심 vs 인사이트 중심)에 따라 시각적 밀도를 유연하게 조정합니다.

*   **Core Philosophy**: 
    *   **Cohesive Identity**: 어떤 페이지에서도 동일한 브랜드 컬러(Hub Blue)와 서체(Pretendard)를 사용하여 일관성을 유지합니다.
    *   **Rich Aesthetics**: 글래스모피즘(`backdrop-blur`), 미세한 그라데이션, 유려한 애니메이션을 통해 프리미엄 감성을 전달합니다.
    *   **Selective Premium**: 고비용 시각 효과는 핵심 대시보드에 집중하여 성능과 가독성을 동시에 확보합니다.

## 2. Color Palette & Roles (Unified)
모든 색상은 [design_tokens.md](../../.agent/knowledge/frontend-ux-constitution/artifacts/design_tokens.md)에 정의된 CSS 변수를 통해 관리됩니다.

> **테마-안전 토큰 (브랜딩 토큰화)**: 컴포넌트는 raw `slate-*`/`gray-*` 유틸리티를 직접 쓰지 않고 `globals.css`의 시맨틱 토큰(`--background`·`--card`·`--popover`·`--primary`·`--muted` 등, light/dark 자동 전환)을 소비합니다. 아래 slate 스케일 값은 이 시맨틱 토큰이 매핑되는 다크 테마 팔레트 프리미티브입니다.

### Core Colors
*   **Vibrant Hub Blue (`--color-hub-blue`)**: `#0055FF` - 시스템 전체의 핵심 액션 및 브랜드 정체성.
*   **Premium Background (`--color-slate-950`)**: `#020617` - 전체 배경의 기본 색상.
*   **Surface / Widget (`--color-slate-900`)**: `#0F172A` - 카드, 위젯 등 콘텐츠 영역의 표면 색상.

### Semantic Accents
*   **Success** / **Warning** / **Destructive**
*   모든 상태 컬러는 Hub Blue와 어우러지도록 채도가 조정된 프리미엄 팔레트를 사용합니다.

## 3. Typography Rules
*   **Font Family**: Pretendard (Primary), Inter (Secondary for EN/Num)
*   **Scales**:
    *   **Hub Title**: `text-hub-title` (800 ExtraBold / Tracking Tighter)
    *   **Standard Title**: `text-standard-title` (600 SemiBold)
    *   **Label**: `text-label` (700 Bold / Tracking Widest / Uppercase)

## 4. Geometry & Variants

### Geometry (Border Radius)
*   **Base UI Radius (`--radius-base`)**: `0.5rem` (8px) - 버튼, 폼 입력창.
*   **Premium Hub Radius**:
    *   `--radius-hub-widget` (0.75rem / 12px): 대시보드 위젯.
    *   `--radius-hub-section` (1rem / 16px): 대시보드 메인 섹션.

### Component Variants
| Variant | 대상 | 주요 특징 |
| :--- | :--- | :--- |
| **Standard** | 데이터 테이블, 상세 폼 | 높은 밀도, 실선 테두리, 미니멀한 그림자(`shadow-sm`) |
| **Premium** | 메인 대시보드, 요약 위젯 | `backdrop-blur`, 그라데이션, 확산형 그림자(`shadow-premium`) |

## 5. Layout & Depth Principles (Hierarchy)
*   **Level 0 (Base)**: `--color-slate-950` - 전체 시스템 배경.
*   **Level 1 (Surface)**: `--color-slate-900` - 기본 콘텐츠 카드.
*   **Level 2 (Active)**: `backdrop-blur` + `bg-slate-900/40` - 모달, 팝오버, 플로팅 요소.

---
*Verified against the frontend constitution token catalog and `globals.css`: 2026-08-19*
