# 프론트엔드 최적화 작업 현황 (Ralph Loop)

## 작업 목표
Vercel React Best Practices를 기반으로 Next.js 프론트엔드 성능 및 렌더링 최적화 진행

## 단계별 체크리스트

### 1단계: 번들 사이즈 최적화 (Barrel 파일 제거)
- [x] `frontend/src/services` 내의 배럴 파일(`index.ts`)을 통한 import를 개별 파일 import로 수정
- [x] 기타 불필요한 배럴 파일 패턴 제거
- [x] 제거 과정에서 발생한 Type Error 및 Import Error 수정 및 `type-check` 통과 확인

### 2단계: 렌더링 성능 개선 (조건부 렌더링 수정)
- [x] `.tsx` 파일 내의 `&&` 조건부 렌더링을 삼항 연산자(`? : null`)로 일괄 변환

### 3단계: 초기 로딩 최적화 (Dynamic Import 적용)
- [x] Recharts 등 무거운 라이브러리를 사용하는 차트 컴포넌트에 `next/dynamic` 적용
- [x] 당장 노출되지 않는 모달/다이얼로그 컴포넌트에 `next/dynamic` 적용

### 4단계: React Query 캐싱 최적화 (데이터 특성에 따른 staleTime 세분화)
- [x] 공통 코드, 메뉴 등 변동이 적은 데이터에 대한 staleTime 증가

### 5단계: Next.js Image 컴포넌트 최적화
- [x] `<img>` 태그를 `<Image />` 컴포넌트로 교체하여 이미지 로딩 성능 향상

### 6단계: TypeScript 엄격성 개선
- [x] 주요 파일에서 `any` 타입 사용을 줄이고 명시적 타입 지정

## 진행 상황 로그
- [x] 최적화 계획 수립 및 작업 파일 생성
- [x] 1단계: 배럴 파일 제거 완료 및 TypeScript 에러 해결
- [x] 2단계: 조건부 렌더링 패턴 수정 완료
- [x] 3단계: Recharts 등 차트 컴포넌트에 클라이언트 지연 로딩(Dynamic Import) 적용 완료
- [x] 3단계: 모달(StandardModal) 컴포넌트에 클라이언트 지연 로딩(Dynamic Import) 적용 완료
- [x] 4단계: 정적 데이터 조회 API(`useQuery`)에 `staleTime` 적용
- [x] 5단계: 정적 이미지 `<img />` 태그를 `next/image` 컴포넌트로 마이그레이션
- [x] 6단계: 대시보드 컴포넌트 등에서 `any` 타입 제거 및 명시적 타입 할당
