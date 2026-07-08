# 디자인 토큰 가이드 (Design Tokens Guide)

본 문서는 `프론트엔드 디자인 및 UX 헌법` 제6조에 따른 세부 디자인 규격을 정의합니다. 모든 컴포넌트 개발 시 아래 토큰을 우선 참조하십시오.

## 1. 컬러 시스템 (Color System)
시스템 전체의 일관성을 위해 단계별 스케일을 사용합니다.

### 1.1 Brand Primary (Hub Blue)
| 50 | 100 | 300 | 500 (Base) | 700 | 900 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `#EFF6FF` | `#DBEAFE` | `#93C5FD` | `#0055FF` | `#1D4ED8` | `#1E3A8A` |

### 1.2 Neutral Slate (Gray Scale)
- **Slate-50**: `#F8FAFC` (기본 텍스트)
- **Slate-800**: `#1E293B` (보더, 구분선)
- **Slate-900**: `#0F172A` (카드/위젯 표면)
- **Slate-950**: `#020617` (전체 배경)

---

## 2. 간격 및 레이아웃 (Spacing & Layout)
모든 간격은 4px(0.25rem) 배수를 사용합니다.

| 토큰명 | 값 | 용도 |
| :--- | :--- | :--- |
| `sp-1` | `0.25rem` (4px) | 아이콘-텍스트 간격 |
| `sp-2` | `0.5rem` (8px) | 컴포넌트 내부 패딩 |
| `sp-4` | `1rem` (16px) | 위젯 내부 패딩 |
| `sp-6` | `1.5rem` (24px) | 섹션 간 간격 |

### 표준 브레이크포인트 (Breakpoints)
- **sm**: `640px` (모바일 가로)
- **md**: `768px` (태블릿)
- **lg**: `1024px` (노트북/일반 데스크톱)
- **xl**: `1280px` (대형 모니터)

---

## 3. 지오메트리 및 깊이 (Geometry & Depth)

### 3.1 곡률 (Border Radius)
- `--radius-base`: `0.5rem` (8px) - 일반 버튼
- `--radius-hub-widget`: `0.75rem` (12px) - 대시보드 미니 위젯
- `--radius-hub-section`: `1rem` (16px) - 대시보드 메인 섹션 카드
- `--radius-hub-item`: `0.5rem` (8px) - 대시보드 리스트 아이템/요약

### 3.2 그림자 레벨 (Shadow Levels)
- **Low**: `shadow-sm` (일반 카드)
- **Mid**: `shadow-md` (호버 시 강조)
- **High**: `shadow-2xl` (모달, 팝오버)
- **Premium**: `shadow-[0_20px_50px_rgba(0,85,255,0.1)]` (Hub 핵심 위젯)

---

## 4. 계층 구조 (z-index Hierarchy)
| 계층 | 값 | 대상 |
| :--- | :--- | :--- |
| **Base** | `0` | 일반 콘텐츠 |
| **Sticky** | `100` | 테이블 헤더 등 |
| **Fixed** | `200` | 네비게이션 바 (GNB) |
| **Overlay** | `300` | 드롭다운, 툴팁 |
| **Modal** | `400` | 모달 창, 다이얼로그 |
| **Pop** | `500` | 토스트 알림, 최상위 팝업 |

---

## 5. 애니메이션 프리셋 (Animations)
- **Transition**: `duration-300 ease-in-out`
- **Micro-interaction**: `hover:scale-[1.02] active:scale-[0.98] transition-transform`
- **Glassmorphism**: `backdrop-blur-xl bg-slate-900/40 border border-slate-800/50`
