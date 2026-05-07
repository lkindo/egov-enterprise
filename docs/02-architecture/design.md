# Design System: eGov Enterprise (Modernized)
**Project ID:** EGOV-ENT-2026

## 1. Visual Theme & Atmosphere: "Unified Premium"
본 시스템은 기존의 실용주의적 관리자 UI와 전문적인 프리미엄 대시보드 UI를 하나의 디자인 언어로 통합한 **"Unified Premium"** 전략을 채택합니다. 단순한 시각적 효과를 나열하는 것이 아니라, 작업의 성격(데이터 중심 vs 인사이트 중심)에 따라 시각적 밀도를 유연하게 조정합니다.

*   **Core Philosophy**: 
    *   **Cohesive Identity**: 어떤 페이지에서도 동일한 브랜드 컬러(Hub Blue)와 서체(Pretendard)를 사용하여 일관성을 유지합니다.
    *   **Adaptive Density**: 데이터 밀집도가 높은 페이지는 날카롭고 촘촘하게, 시각적 요약이 중요한 페이지는 부드럽고 여유롭게 구성합니다.
    *   **Selective Premium**: `backdrop-blur`와 같은 고비용 시각 효과는 핵심 대시보드에 적절히 집중하여 성능과 가독성을 동시에 확보합니다.

## 2. Color Palette & Roles (Unified)

### Core Colors
*   **Vibrant Hub Blue (#0055FF)**: 시스템 전체의 핵심 액션 및 브랜드 정체성.
*   **Premium Slate (#020617)**: 텍스트 및 대비가 필요한 배경의 기본 색상.
*   **Soft Gray (#F1F5F9)**: 보조 배경 및 비활성 영역.

### Semantic Accents
*   **Success (#15803D)** / **Warning (#F59E0B)** / **Destructive (#BE123C)**
*   모든 상태 컬러는 Hub Blue와 어우러지도록 채도가 조정된 프리미엄 팔레트를 사용합니다.

## 3. Typography Rules (Unified)
*   **Font Family**: Pretendard (KR), Inter (EN/Num)
*   **Scale**:
    *   **Hub Title**: 900 Black / -0.05em Tracking. 대규모 요약 수치 및 섹션 제목.
    *   **Standard Title**: 700 Bold / Normal Tracking. 일반 카드 및 폼 제목.
    *   **Label**: 900 Black / 0.3em ~ 0.4em Tracking / Uppercase. 메타데이터 및 태그.
    *   *Note: 시스템 라벨이나 기술적 지표에서는 이탤릭체 대신 넓은 자간과 '_' 접두사를 사용하여 전문적이고 안정적인 느낌을 강조합니다.*

## 4. Design Tokens & Variants

### Geometry (Dynamic & Static Radius)
*   **Base UI Radius (`--radius`)**: `0.5rem` (8px) - 기본 버튼, 폼 입력창, 일반 카드에 적용되어 안정감 있는 밀도를 유지합니다.
*   **Premium Hub Radius (Dynamic Scale)**: 어드민 페이지(`LayoutManagerClient`)의 **System Design Engine**을 통해 전역으로 제어되는 동적 곡률 시스템입니다. (기본 Base Factor `1.2rem` 기준)
    *   `--radius-hub-section` (Base × 3.5): 대시보드의 메인 섹션 컨테이너.
    *   `--radius-hub-widget` (Base × 2.0): 벤트 카드 등 중간 크기 위젯.
    *   `--radius-hub-item` (Base × 1.5): 핵심 강조 버튼 및 목록 아이템.
    *   Note: Hub 관련 컴포넌트 개발 시 하드코딩된 Tailwind 클래스 `rounded-xl` 등 대신, 가급적 이 동적 CSS 변수를 사용하여 시스템 제어와 동기화되도록 구성해야 합니다. (이탤릭체 대신 정자체와 자간 사용 권장)

### Component Variants
개발 시 컴포넌트의 `variant` 속성을 통해 디자인 강도를 조절합니다.

| Variant | 대상 | 주요 특징 |
| :--- | :--- | :--- |
| **Standard** | 데이터 테이블, 상세 폼, 설정 페이지 | 높은 밀도, 실선 테두리, 미니멀한 그림자(`shadow-sm`) |
| **Premium** | 메인 대시보드, 요약 위젯, 랜딩 섹션 | `backdrop-blur`, 그라데이션, 확산형 그림자(`shadow-hub-premium`) |

## 5. Layout & Depth Principles
*   **Hierarchy of Depth**:
    *   **Level 0 (Surface)**: `#F1F5F9` (Soft Gray) - 전체 배경.
    *   **Level 1 (Card)**: `#FFFFFF` (White) - 기본 콘텐츠 영역.
    *   **Level 2 (Active)**: `backdrop-blur` + White/80% - 모달 및 팝오버.
*   **Micro-interactions**: Hover 시 `translate-y-[-2px]`와 `shadow-lg`를 결합하여 물리적인 깊이감을 표현합니다.

## 6. Accessibility & Localization
*   **Contrast**: 모든 텍스트는 WCAG 2.1 AA 등급 이상의 대비를 유지합니다.
*   **Touch Targets**: 버튼 및 인터랙티브 요소는 최소 44x44px의 클릭 영역을 확보합니다.
