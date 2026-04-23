# eGov Enterprise UI/UX 최적화 및 문제점 리포트

본 리포트는 Vercel Web Interface Guidelines 기반으로 eGov Enterprise 프론트엔드(Next.js) 환경의 UI/UX 안티패턴 및 최적화 방안을 분석한 결과입니다.

## 1. 퍼포먼스 및 렌더링 최적화 (Animation & Performance)

### 🚨 문제점: 광범위한 `transition-all` 사용
- **발견 현황**: 90여 개 이상의 UI 컴포넌트(`loading.tsx`, `Header.tsx`, `CommandCenter`, `DataTable` 등)에서 `transition-all` 유틸리티 클래스가 무분별하게 사용되고 있습니다.
- **영향**: 레이아웃(`width`, `margin` 등)을 포함한 모든 속성이 트랜지션 대상이 되어, 렌더링 성능 저하와 버벅임(Jank) 현상을 유발할 수 있습니다.
- **최적화 방안**:
  - `transition-all`을 제거하고, 변경이 필요한 특정 속성만 명시하세요. (예: `transition-colors`, `transition-transform`, `transition-opacity`)
  - Compositor-friendly한 속성(`transform`, `opacity`) 위주로 애니메이션을 설계하세요.
  - Vercel Guideline: "Never `transition: all` — list properties explicitly"

### 💡 추가 제안: 롱 리스트 렌더링 가상화(Virtualization)
- `DataTable`이나 긴 목록을 렌더링하는 컴포넌트는 `virtua` 라이브러리나 CSS `content-visibility: auto`를 적용하여 렌더링 병목을 방지해야 합니다.

---

## 2. 접근성 (Accessibility & A11Y)

### 🚨 문제점: Semantic HTML 위반 (`div`/`span`에 `onClick` 할당)
- **발견 위치**: 
  - `standard-data-table.tsx`
  - `smart-form-renderer.tsx`
  - `KnowledgeHubClient.tsx`
  - `standard-date-picker.tsx`
- **영향**: 스크린 리더 등 보조 기기가 해당 요소를 상호작용 가능한 요소로 인식하지 못하며, 키보드(Tab) 네비게이션이 불가능합니다.
- **최적화 방안**:
  - 클릭 가능한 요소는 반드시 `<button type="button">` 또는 `<a>` 태그를 사용하세요.
  - 불가피한 경우 `role="button"`과 `tabIndex={0}`를 추가하고, `onKeyDown` (Enter/Space 키 처리) 이벤트 핸들러를 함께 구현해야 합니다.

### 🚨 문제점: 접근성 링커 누락 (`outline-none` 무분별한 사용)
- **발견 현황**: 50개 이상의 컴포넌트(`input.tsx`, `dialog.tsx`, `button.tsx` 등)에서 `outline-none`이 사용되었습니다.
- **영향**: 키보드 사용 시 현재 포커스된 요소를 시각적으로 파악할 수 없어 UX가 심각하게 저하됩니다.
- **최적화 방안**:
  - `outline-none` 단독 사용을 지양하고, `focus-visible:ring-2 focus-visible:ring-primary`와 같이 포커스 시 대체 스타일이 확실히 제공되도록 보장하세요.
  - 단순 클릭 시 생기는 포커스 아웃라인을 피하려면 `:focus` 대신 `:focus-visible`를 적극 활용하세요.

### 💡 추가 제안: `aria-hidden` 및 `alt` 텍스트
- 장식용 아이콘(Lucide Icon 등)에는 `aria-hidden="true"`를 속성으로 추가하여 스크린 리더가 읽지 않고 넘어가도록 최적화하세요.
- 모든 `<Image>`/`<img>` 컴포넌트의 `alt` 속성을 점검하고, 장식용인 경우 `alt=""`로 설정하세요.

---

## 3. 모바일 터치 및 인터랙션 최적화 (Touch & Interaction)

### 💡 최적화 제안: 더블 탭 확대 방지 및 스크롤 체인
- **Double-Tap Zoom 방지**: 버튼 및 상호작용 요소에 `touch-action: manipulation` 클래스를 추가하여 모바일 환경에서 300ms 클릭 지연을 제거하세요.
- **Overscroll Behavior**: `Dialog`, `Modal`, `Drawer`와 같은 오버레이 요소에는 `overscroll-contain` (또는 `overscroll-behavior: contain`) 속성을 추가하여 백그라운드 스크롤(Scroll Chaining)이 발생하지 않도록 제어하세요.
- **Safe Area Insets**: 모바일 노치나 둥근 모서리 대응을 위해 전체 레이아웃 요소에 `env(safe-area-inset-*)` 변수를 고려하여 패딩을 적용하세요.

---

## 🚀 권장 넥스트 스텝 (Action Plan)
1. 가장 시급한 **접근성 이슈**(`div onClick` -> `<button>` 변경)부터 리팩토링 진행.
2. 컴포넌트 라이브러리 레벨(`components/ui/**`)에서 `transition-all` 일괄 걷어내기 및 최적화.
3. 포커스 상태 점검을 위한 키보드(Tab) 네비게이션 수동 테스트 진행.
