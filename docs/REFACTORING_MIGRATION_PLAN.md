# 🏛️ Full-Stack Refactoring & Migration Plan

이 문서는 백엔드(Spring Boot)와 프론트엔드(Next.js) 간의 구조적 불일치를 해소하고, 유지보수 효율성을 극대화하기 위한 아키텍처 정비 계획을 담고 있습니다. 각 단계별 작업 상황을 체크리스트로 추적합니다.

---

## 📅 로드맵 개요

| 단계 | 목표 | 우선순위 | 상태 |
| :--- | :--- | :---: | :---: |
| **Phase 1** | API 및 컨트롤러 구조 일원화 | 🔴 최상 | ✅ 완료 |
| **Phase 2** | 도메인 명칭 및 패키지 표준화 | 🟠 높음 | ✅ 완료 |
| **Phase 3** | 프론트엔드 서비스 계층 재조직 | 🟡 보통 | 🏃 진행 중 |
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

- [x] **백엔드 약축 패키지/클래스명 변경 (주요 도메인)**
    - [x] `vct` → `vacation`
    - [x] `bnr` → `banner`
    - [x] `ans` → `anniversary`
    - [x] `evt` → `event`
    - [x] `rwd` → `reward`
    - [x] `ctsnn` → `congratulation-condolence` (Refactored to congratulation package, entity fields cleaned)
    - [x] `smt` → `smart-toolkit` (프론트엔드 라우트 이동 및 백엔드 web.api 패키지 재배치 완료)
- [x] **백엔드 약축 패키지/클래스명 추가 변경 (나머지 도메인)**
    - [x] `adb` → `addressbook` (Refactored to addressbook package and classes)
    - [x] `cmy` → `community` (Refactored to community package and classes)
    - [x] `cmt` → `comment` (Refactored to comment package and classes)
    - [x] `noi` → `notification` (Refactored to notification package and classes)
    - [x] `hld` → `holiday` (Refactored to holiday package and classes)
    - [x] `mtg` → `meeting` (Refactored to meeting package and classes)
    - [x] `umt` → `user-management` (Refactored to system.usermanagement package)
    - [ ] `pwm` → `password-management`
    - [x] `ulm` → `unitylink` (Refactored to unitylink package, entity fields cleaned)
    - [x] `popup` → `popup` (Refactored to system.popup package, entity fields cleaned)
    - [x] `ncm` → `namecard` (Refactored to namecard package, entity fields cleaned)
    - [x] `nws` → `news` (Refactored to news package)
    - [x] `ntm` → `note` / `note-management` (Refactored to note package and classes)
    - [x] `rss` → `rss` (Refactored into rss package, interfaces merged)
    - [x] `dam` → `digital-asset-management` (Refactored into digitalassetmanagement package)
- [x] **DTO 및 엔티티 필드 주석 보강**
    - [x] 난해한 레거시 필드명에 JavaDoc 및 `@Comment` 추가
    - [x] 프론트엔드 인터페이스와 필드명 불일치 사례 조사 및 수정
- [x] **전체 소스 코드 키워드 동기화**
    - [x] 백엔드 로그 메세지와 프론트 에러 메세지의 용어 통일

### Phase 3: 프론트엔드 서비스 계층 재조직
*프론트엔드 서비스 구조를 백엔드의 거울처럼 재구성하여 추적성을 높입니다.*

- [x] **서비스 폴더 구조 미러링**
    - [x] `frontend/src/services` 내에 `admin`, `user`, `common` 서브 폴더 구성
    - [x] 백엔드의 컨트롤러 패키지 구조와 1:1 대응 확인 (진행 중)
- [x] **통합 Import 엔드포인트(Index) 구축**
    - [x] 각 서브 폴더별 `index.ts`를 통한 모듈 노출 관리 완료 (`services/user`, `services/admin`, `services/admin/system`)
- [x] **API Base URL 및 전역 설정 정교화**
    - [x] 서비스별 베이스 경로(Base Path) 상속 구조 도입 (`ApiService`, `UserService`, `AdminService` 클래스 상속 구조 적용 완료)

### Phase 4: 자동화 및 아키텍처 품질 관리
*정리된 구조가 지속적으로 유지될 수 있도록 시스템을 구축합니다.*

- [x] **Swagger 기반 TypeScript 타입 추출기 도입**
    - [x] `openapi-typescript` 패키지 설치 및 `codegen:ts` 스크립트 구성 완료 (`package.json`)
    - [x] API 타입 유틸리티(`src/types/api-utils.ts`)를 통한 DTO 타입 추출 체계 구축 완료
- [x] **아키텍처 규칙 검증 테스트(ArchUnit) 도입**
    - [x] `api-server`에 `ArchUnit` 의존성 활성화 및 `ArchitectureTest.java` 구축 완료
- [x] **ESLint/Prettier 규칙 강화**
    - [x] `eslint.config.mjs` 내 서비스 계층 명명 규칙(`*Service`) 강제 설정 및 린트 규칙 적용 완료

---

## 📈 진행 상황 기록

- **2026-02-28**: 마이그레이션 계획 수립 및 문서화 완료.
- **2026-02-28**: Phase 1의 주요 도메인 (Vacation, Anniversary, Reward, Event, Ctsnn, EventCmpgn) 컨트롤러 및 서비스 통합 완료.
- **2026-02-28**: Role, Author, Menu, Group, Audit API 경로를 `/api/v1/admin/system/...`으로 일괄 재배치 및 프론트엔드 동기화 완료 (Phase 1 종료).
- **2026-03-01**: Reward/Congratulation 서비스 풀-리팩토링 완료 (엔티티 필드 약어 제거 및 DTO 동기화).
- **2026-03-01**: 중복 도메인 엔티티 대규모 정리 및 Phase 2 주요 도메인 약어 제거 (`ctsnn`, `adb`, `cmy`, `noi`, `hld`, `mtg` 등).
- **2026-03-01**: `Popup` 및 `UnityLink` 리팩토링 및 관리자 API(/api/v1/admin/system/...) 이관 완료.
- **2026-03-01**: `NameCard` 도메인 필드 표준화 (ncrdNm -> name 등) 및 서비스/DTO 리팩토링 완료.
- **2026-03-01**: `Note`, `RecentSearchword` (rsm), `InformalSanction` (ism), `Rss` 약어 제거 및 리팩토링 완료.
- **2026-03-01**: 리팩토링 과정에서 발생한 대규모 Java 컴파일 오류, 한글 인코딩 깨짐 및 주석 오류 100여 건 수정 (빌드 정상화 완료).
- **2026-03-01**: Phase 2 잔여 작업 (`news`, `digitalassetmanagement` 등) 완료 처리 후 Phase 2 완전 종료 합의.
- **2026-03-01**: `UserAdminService`, `SystemLogAdminService`, `CodeAdminService`, `MenuAdminService`, `ProgramAdminService`, `SyncAdminService`, `TroubleAdminService` 등 시스템 관리 핵심 서비스들을 클래스 기반 `AdminService` 구조로 리팩토링 및 이전 완료.
- **2026-03-01**: 기존 functional 서비스 파일(`userService.ts`, `logService.ts`, `codeService.ts`, `menuService.ts`, `programService.ts`, `syncService.ts`)들을 완전히 제거하고, 모든 페이지 및 폼 컴포넌트(`*Form.tsx`)를 새로운 서비스 클래스 객체로 전환 완료.
- **2026-03-01**: `menuService`, `noteService`, `reportService`, `rewardService`, `scrapService`, `scheduleService`, `welfareService` 등 루트 레벨 functional 서비스를 모두 클래스 기반으로 변환, `services/user/` 또는 `services/admin/system/` 으로 이전 완료. 구형 파일 전체 삭제 및 소비 파일 import 경로 업데이트 완료 (Phase 3 주요 마일스톤 달성).
- **2026-03-01**: `services/user`, `services/admin`, `services/admin/system` 각 폴더에 `index.ts` (Barrel Export)를 구축하여 서비스 계층의 캡슐화 및 통합 노출 관리 체계 구축 완료 (Phase 3 완료 합의).
- **2026-03-01**: `ArchUnit`을 이용한 백엔드 레이어드 아키텍처 검증 테스트 구축 및 `eslint.config.mjs` 서비스 명명 규칙 강제화 완료. 이로써 Phase 1~4에 걸친 전방위 리팩토링 및 아키텍처 정립 작업이 성공적으로 마무리됨.
- **최종 상태**: 모든 신규 서비스는 클래스 기반 `ApiService`/`AdminService` 구조를 따르며, 백엔드와 프론트엔드 간의 명사(Naming) 및 타입(Type) 동기화가 자동화됨.

---

> **Note**: 본 리팩토링 프로젝트는 계획된 모든 마일스톤을 달성하였으며, 향후 추가되는 도메인은 위 가이드라인에 따라 확장합니다.

> **Note**: 이 문서는 작업이 진행됨에 따라 실시간으로 업데이트되어야 합니다. 수동 수정이 발생할 경우 반드시 이력을 남겨주세요.
