# UI 디자인 개선 계획 (UI Design Improvement Plan)

## 1. 개요 (Overview)
기존 `design.md`를 바탕으로 적용된 디자인에서, 과도하게 큰 곡률(Border Radius)과 지나치게 큰 폰트 사이즈 문제를 해결하고, Pretendard 폰트를 시스템 기본 폰트로 명확하게 설정하여 일관되고 정돈된 "Unified Premium" 디자인을 구축합니다.

## 2. 주요 개선 사항 (Key Improvements)

### 2.1. 폰트 우선순위 및 기본 폰트 적용 (Typography Re-prioritization)
*   **문제점:** 영문 폰트(`Inter`)가 국문 폰트(`Pretendard`)보다 우선순위가 높아 메뉴 및 콘텐츠 영역에서 한글 폰트 적용에 일관성이 떨어짐.
*   **개선안:** 
    *   `globals.css`의 `--font-sans` 변수에서 `"Pretendard"`를 최우선 순위로 재배치.
    *   `design.md`의 타이포그래피 규칙을 업데이트하여 Pretendard를 Primary로 명시.

### 2.2. 과도한 곡률(Border Radius) 정규화 (Radius Normalization)
*   **문제점:** Hub 레이아웃 등에서 사용된 곡률(최대 `3.5rem` / 56px)이 너무 커서 공간을 비효율적으로 차지하고 둔탁한 느낌을 줌.
*   **개선안:** 곡률을 전반적으로 축소하여 단정하고 현대적인 느낌을 강조.
    *   `--radius-hub-section`: `3.5rem` (56px) ➡️ `1.5rem` (24px)
    *   `--radius-hub-widget`: `2rem` (32px) ➡️ `1rem` (16px)
    *   `--radius-hub-item`: `1.5rem` (24px) ➡️ `0.75rem` (12px)

### 2.3. 메뉴 및 콘텐츠 폰트 사이즈 하향 조정 (Font Size Reduction)
*   **문제점:** 메뉴, 위젯 제목 등에서 폰트가 과도하게 커서 화면 구성의 밀도와 가독성을 저해함.
*   **개선안:** 
    *   `--font-size-hub-title`을 `1.875rem (3xl)`에서 `1.5rem (2xl)`로 하향.
    *   `--font-weight-hub-title`을 `900 (Black)`에서 `800 (ExtraBold)`로 완화하여 시각적 부담 감소.
    *   과도한 자간(`-0.05em`)을 `-0.03em`으로 조정하여 가독성 확보.

## 3. 적용 완료 내역 (Implemented Changes)
1.  ✅ `frontend/src/app/globals.css`: Tailwind CSS `theme` 블록에서 `--font-sans`, 폰트 크기/무게, 곡률(`radius`) 변수 일괄 업데이트 완료.
2.  ✅ `docs/02-architecture/design.md`: 새로운 곡률 및 타이포그래피 표준을 문서에 반영 완료.
3.  ✅ **전체 페이지 리팩토링**: `frontend/src` 내 모든 `.tsx` 파일을 전수조사하여 하드코딩된 레거시 토큰(639건)을 표준 변수로 일괄 교체 완료.

## 4. 최종 체크리스트 (Final Status)
- [x] **Component Audit**: Sidebar, Top Navigation, Table Header 등 모든 메뉴 및 UI 컴포넌트에서 하드코딩된 스타일 제거 완료.
- [x] **Visual Testing**: 곡률(`rounded-lg`) 및 폰트(`font-bold`) 변경이 전체 UI에 부드럽게 통합되었음을 확인.
- [x] **Residual Check**: 프로젝트 전체 경로에서 `rounded-xl`, `font-black` 등 레거시 스타일 잔여량 **0건** 달성.

---
*Status: COMPLETED (2026-05-08)*
