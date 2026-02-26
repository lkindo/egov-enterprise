# 🚀 Frontend Optimization Task (Next.js 15 & Vercel Best Practices)

이 프로젝트는 Vercel 리액트 베스트 프랙티스를 준수하며, 성능 및 안정성 최적화를 목표로 합니다.

## 🏁 현재 진행 현황 (Progress)
- [x] 전역 로딩 UI 구현 (`loading.tsx`)
- [x] 게시판 목록/상세 페이지 서버 사이드 패칭 전환 (Waterfall 제거)
- [x] 게시판 등록/삭제 Server Actions 도입
- [x] 대시보드/검색 페이지 비동기 병렬 처리 최적화 (`Promise.all`)
- [x] 주요 컴포넌트 Dynamic Import 적용 (차트, 모달 등)
- [x] 서버 데이터 직렬화 최소화 (Props 필터링)
- [x] 렌더링 안정성 확보 (`&&` -> `? : null`)

---

## 📋 세부 체크리스트 (Detailed Checklist)

### 1. [CRITICAL] 비동기 워터폴 제거 (Eliminating Waterfalls)
> 초기 로딩 속도 향상을 위해 서버 사이드에서 데이터를 미리 가져오고 병렬 처리합니다.
- [x] RootLayout: 메뉴 프리패칭 도입
- [x] Search Page: 서버 사이드 초기 검색 결과 패칭
- [x] Board (BBS): 목록 및 상세 페이지 서버 컴포넌트화
- [x] Admin Pages (KNO): 지식관리 목록/상세 서버 패칭 및 수정/삭제 서버 액션 전환
- [x] Admin Pages (Users): 사용자 관리 목록 서버 패칭 및 CUD 서버 액션 전환
- [x] Admin Pages (Codes): 공통 코드 마스터/상세 서버 패칭 (Promise.all) 및 서버 액션 전환
- [x] Admin Pages (Program): 프로그램 관리 리팩토링 및 서버 액션 전환
- [x] Admin Pages (Banner/Popup): 배너/팝업 통합 관리 리팩토링 및 서버 액션 전환
- [x] Admin Pages (Batch): 배치 작업 관리 리팩토링 및 서버 액션 전환
- [x] **Promise.all 적용**: 복수 API 호출 시 병렬 처리 완료 (`Codes`, `Menus`, `Dashboard`, `Banner`, `Batch`)

### 2. [CRITICAL] 주요 컴포넌트 Dynamic Import 적용
> 초기 JS 번들 크기를 줄여 LCP와 TBT를 개선합니다.
- [x] Dashboard: 차트 및 복잡한 위젯 `next/dynamic` 적용
- [x] Board List: `BoardStats` (recharts) 동적 임포트
- [x] Global Modals: 클라이언트 사이드 전용 모달 동적 임포트
- [x] **모니터링 모듈**: 각 탭별 모니터링 컴포넌트(`ServerResource`, `HttpMonitor` 등)에 `next/dynamic` 적용
- [x] **차트 라이브러리**: `BoardStats`, `DashboardCharts` 등 Recharts 의존 컴포넌트 dynamic 적용 완료

### 3. [HIGH] 서버 데이터 직렬화 최소화 (Server Serialization)
> 네트워크 전송 비용과 성능 하락을 방지하기 위해 필요한 필드만 전송합니다.
- [x] Server Component -> Client Component 전달 데이터 필터링 유틸리티 적용
- [x] 검색 결과 등 리스트 데이터에서 불필요한 메타데이터 제거
- [x] **Serialization 유틸리티**: `selectFieldsList` 개발 및 `User Manage` 페이지 적용 완료

### 4. [MEDIUM] 렌더링 최적화 및 안정성 확보
> 불필요한 리렌더링을 방지하고 엣지 케이스에서의 오류를 차단합니다.
- [x] 코드 전반의 `&&` 렌더링 로직을 삼항 연산자로 대체
- [x] **시스템 관리 잔여 모듈**: `Reward`, `Trouble`, `Vacation`, `Ctsnn`, `ECC`, `ISM` 리팩토링 및 럭셔리 디자인, 서버 직렬화 최적화 완료
- [ ] 자주 리렌더링되는 리스트 아이템에 `React.memo` 적용 검토
- [x] **논리 연산자 제거**: 리팩토링된 주요 클라이언트 컴포넌트의 JSX 내 `&&`를 삼항 연산자로 대체 완료
- [ ] **React.memo 적용**: 빈번한 리렌더링 발생 컴포넌트 식별 및 최적화 (향후 과제)

---

## 📓 히스토리 (History)
- **2026-02-26**: 게시판(BBS) 핵심 기능 서버 액션 및 서버 컴포넌트화 완료. 전역 로딩 UI 추가.
- **2026-02-26**: 사용자 관리, 공통 코드 관리 페이지 리팩토링 완료. `Promise.all` 병렬 패칭 적용.
- **2026-02-26**: 프로그램 관리, 배너/팝업 관리, 배치 관리 페이지 및 서버 액션 리팩토링 완료.
- **2026-02-26**: 분석 대시보드(Stats) 서버 컴포넌트화 및 프리미엄 UI 리팩토링 완료.
- **2026-02-26**: 통합 검색 페이지 서버 사이드 패칭 최적화 및 안정성 확보.
- **2026-02-26**: 시스템 관리 핵심 모듈(Audit, Backup, Comments, Network, Server, Sync) 리팩토링 및 럭셔리 디자인 적용 완료.
- **2026-02-26**: 시스템 관리 추가 모듈(Reward, Trouble, Vacation, Ctsnn, ECC, ISM) 리팩토링 및 서버 직렬화 최적화 완료.
- **2026-02-26**: 시스템 관리 최적화 프로세스 및 `task.md` 업데이트 완료.
- **2026-02-26**: 로컬 데이터베이스의 스키마와 데이터를 Supabase Transaction Pooler를 활용하여 마이그레이션 완료.
- **2026-02-26**: 백엔드 스프링 `application.yml` 설정 파일들(dev, prod)의 데이터소스 설정을 새로운 Supabase 연결 정보로 업데이트 완료.

