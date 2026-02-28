# 🏛️ Full-Stack Refactoring & Migration Plan

이 문서는 백엔드(Spring Boot)와 프론트엔드(Next.js) 간의 구조적 불일치를 해소하고, 유지보수 효율성을 극대화하기 위한 아키텍처 정비 계획을 담고 있습니다. 각 단계별 작업 상황을 체크리스트로 추적합니다.

---

## 📅 로드맵 개요

| 단계 | 목표 | 우선순위 | 상태 |
| :--- | :--- | :---: | :---: |
| **Phase 1** | API 및 컨트롤러 구조 일원화 | 🔴 최상 | ✅ 완료 |
| **Phase 2** | 도메인 명칭 및 패키지 표준화 | 🟠 높음 | 🏃 진행 중 |
| **Phase 3** | 프론트엔드 서비스 계층 재조직 | 🟡 보통 | 진행 전 |
| **Phase 4** | 타입 자동화 및 아키텍처 가드레일 | 🔵 지속 | 진행 전 |

---

## 🛠️ 세부 실행 계획

### Phase 1: API 및 컨트롤러 구조 일원화
*중복된 기능을 통합하고 도메인별 API 엔드포인트를 정체성에 맞게 재배치합니다.*

- [x] **중복 컨트롤러 분석 및 통합**
    - [x] `vct.VacationController`와 `system.VacationController` 로직 비교 및 통합
    - [x] `ans.AnniversaryController`와 `system.AnniversaryController` 통합
    - [x] `rwd.RewardController`와 `system.RewardController` 통합
    - [x] `evt.EventController`와 `system.EventController` 통합
    - [x] `ctsnn.CtsnnController`와 `system.CtsnnManageController` 통합
    - [x] `system` 패키지로 관리자 API(/api/v1/admin/...) 이관 완료
    - [x] 도메인 패키지에는 순수 사용자 API만 남김
    - [x] 중복된 `system` 패키지의 Service 및 DTO 제거 완료 (Vacation, Anniversary, Reward, Event, Ctsnn)
- [x] **API 엔드포인트 명명 규칙 적용**
    - [x] 모든 관리자 API를 `/api/v1/admin/system/` 접두사 아래로 통일 (Role, Author, Menu, Group, Audit 등 포함)
    - [x] RESTful 원칙에 따른 경로 재설계 (Verb 대신 Noun 사용)
- [x] **Swagger 문서 최적화**
    - [x] `@Tag` 속성을 사용하여 도메인별/권한별 API 그룹핑 시각화 (한국어 설명 적용)
- [x] **프론트엔드 동기화 (Phase 1 연계)**
    - [x] `services` 및 `actions` 내 API 호출 경로를 새로운 관리자 경로(`/admin/system/...`)에 맞춰 업데이트 완료

### Phase 2: 도메인 명칭 및 패키지 표준화 (Naming Refactoring)
*코드 내 약어(Abbreviation)를 제거하고 프론트엔드와 백엔드의 언어를 통일합니다.*

- [x] **백엔드 약축 패키지/클래스명 변경**
    - [x] `vct` → `vacation`
    - [x] `bnr` → `banner`
    - [x] `ans` → `anniversary`
    - [x] `evt` → `event`
    - [x] `rwd` → `reward`
    - [x] `ctsnn` → `congratulation-condolence`
    - [x] `smt` → `smart-toolkit` (프론트엔드 라우트 이동 및 백엔드 web.api 패키지 재배치 완료)
- [ ] **DTO 및 엔티티 필드 주석 보강**
    - [ ] 난해한 레거시 필드명에 JavaDoc 및 `@Comment` 추가
    - [ ] 프론트엔드 인터페이스와 필드명 불일치 사례 조사 및 수정
- [ ] **전체 소스 코드 키워드 동기화**
    - [ ] 백엔드 로그 메세지와 프론트 에러 메세지의 용어 통일

### Phase 3: 프론트엔드 서비스 계층 재조직
*프론트엔드 서비스 구조를 백엔드의 거울처럼 재구성하여 추적성을 높입니다.*

- [ ] **서비스 폴더 구조 미러링**
    - [ ] `frontend/src/services` 내에 `admin`, `user`, `common` 서브 폴더 구성
    - [ ] 백엔드의 컨트롤러 패키지 구조와 1:1 대응 확인
- [ ] **통합 Import 엔드포인트(Index) 구축**
    - [ ] 각 서브 폴더별 `index.ts`를 통한 모듈 노출 관리
- [ ] **API Base URL 및 전역 설정 정교화**
    - [ ] 서비스별 베이스 경로(Base Path) 상속 구조 도입 (예: `AdminService` 클래스 상속)

### Phase 4: 자동화 및 아키텍처 품질 관리
*정리된 구조가 지속적으로 유지될 수 있도록 시스템을 구축합니다.*

- [ ] **Swagger 기반 TypeScript 타입 추출기 도입**
    - [ ] `openapi-typescript` 등을 활용한 백엔드 DTO -> 프론트 interface 자동 생성
- [ ] **아키텍처 규칙 검증 테스트(ArchUnit) 도입**
    - [ ] 백엔드 패키지 간 순환 참조 방지 및 비즈니스 규칙 위반 검사
- [ ] **ESLint/Prettier 규칙 강화**
    - [ ] 서비스 계층의 명명 규칙 및 폴더 위치 강제 규칙 추가

---

## 📈 진행 상황 기록

- **2026-02-28**: 마이그레이션 계획 수립 및 문서화 완료.
- **2026-02-28**: Phase 1의 주요 도메인 (Vacation, Anniversary, Reward, Event, Ctsnn, EventCmpgn) 컨트롤러 및 서비스 통합 완료.
- **2026-02-28**: Role, Author, Menu, Group, Audit API 경로를 `/api/v1/admin/system/...`으로 일괄 재배치 및 프론트엔드 동기화 완료 (Phase 1 종료).
- **다음 작업**: 
    1. Phase 2 (도메인 명칭 및 패키지 표준화) 착수 - 약어 제거 작업 시작.
    2. `vct` -> `vacation` 리팩토링부터 순차적으로 진행.

---

> **Note**: 이 문서는 작업이 진행됨에 따라 실시간으로 업데이트되어야 합니다. 수동 수정이 발생할 경우 반드시 이력을 남겨주세요.
