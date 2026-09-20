# ADR-0020 — 재사용 백엔드의 멀티모듈·단일모듈 출력 선택

- 상태: Accepted
- 결정일: 2026-09-19
- 승인 범위: 사용자가 명시한 원본 모듈 구조 유지와 두 가지 내보내기 형태 제공
- supplements: [ADR-0001](ADR-0001-core-app-product-boundary.md)의 신규 프로젝트용 소스 배포 형태
- 관련: [선택형 프로젝트 생성기 설계](../project-composer-design.md), [재사용 가이드](../../03-guides/reusable-base-guide.md)

## 맥락

원본의 `foundation`, `business-core`, `business-app`, `api-server` 계층은 책임과 재사용 경계를 관리하는 기반이다. 도입자는 이 원본을 유지하면서, 생성 프로젝트는 기존 멀티모듈 또는 하나의 Gradle 프로젝트 중에서 선택해 독립 소스로 인수하기를 요청했다.

업무 기능 선택과 백엔드 빌드 형태는 서로 다른 축이다. 단일모듈 출력 때문에 원본 구조를 바꾸거나 소스·DB·권한의 의미를 달리할 이유는 없다. 다만 기존 하네스는 소스 경로와 모듈별 클래스패스를 사용하고, 같은 이름의 테스트와 설정 자원도 있어 파일을 한 디렉터리에 복사하는 것만으로 검증 경계를 보존할 수 없다.

## 결정

1. 원본 저장소의 Gradle 모듈과 책임은 유지한다. 생성할 때 `multi-module` 또는 `single-module`을 선택하며 기본값은 기존 출력인 `multi-module`이다. 이 결정은 원본의 단일모듈 전환을 승인하지 않는다.
2. `single-module`은 `include` 없는 루트 Gradle project 하나로 정의한다. 기존 `foundation`, `business-core`, `business-app`, `api-server` 디렉터리는 논리적 소스 그룹으로 보존하고 source set으로 연결한다. Java 패키지·API·DB 계약은 유지하며, 모든 파일을 루트 `src`로 물리 통합하는 기능은 포함하지 않는다. 프론트엔드는 기존 별도 애플리케이션을 유지한다.
3. 원본 출처별 검증용 source set과 테스트 suite의 클래스패스를 분리한다. core에 app 코드가 섞이지 않아야 한다는 컴파일·아키텍처 계약과 테스트 자원 격리를 보존한다. 중복 클래스·자원은 명시적 처리 근거 없이 덮어쓰지 않고 실패시킨다. 출력 형태를 맞추기 위해 테스트를 삭제·skip하거나 게이트의 적용범위를 줄이지 않는다.
4. 레이아웃은 소스 산출물 lock과 검증 보고서에 결속한다. 레이아웃 필드가 없는 기존 산출물은 `multi-module`로 해석하고, 알 수 없는 값과 요청·산출물의 불일치는 거부한다. 개발 실행, 검증 task, 컨테이너 빌드와 CI도 같은 출력 형태에 맞춘다.
5. 현재 `core`, `collaboration`, `demo` 누적 프로필과 PostgreSQL 범위를 유지한다. 레이아웃만 다른 경우 같은 프로필의 DB 번들을 사용하며 테이블·메뉴·권한의 의미를 바꾸지 않는다. DB 생성은 기존 일회용 PostgreSQL 및 빈 DB 재적용 경계를 따른다.
6. `migration-tool`은 온라인 main/test 클래스패스와 실행 jar에 넣지 않는다. 단일 Gradle project에서도 별도 migration source set·테스트·`migrationBootJar`로 보존하며, 오프라인 이관의 승인·실행 경계는 [ADR-0008](ADR-0008-multi-source-approved-migration-workflow.md)을 따른다.
7. 생성물은 도입자가 독립적으로 수정하는 소스 인수본이다. 원본 참조와 생성 lock은 출처를 기록하며, 이후 사용자 수정본에 대한 자동 덮어쓰기나 자동 업그레이드를 약속하지 않는다. 기관별 온라인·이관 운영 승인은 [ADR-0018](ADR-0018-governance-review-lifecycle-and-adoption.md)의 별도 절차를 유지한다.

## 검토한 대안과 영향

- 원본을 단일모듈로 바꾸면 중앙 저장소의 컴파일 경계를 잃으므로 채택하지 않는다.
- 기존 멀티모듈에서 실행 jar 하나만 제공하는 방식은 도입자가 요청한 단일 Gradle 프로젝트 선택을 충족하지 않는다.
- 소스를 루트 `src`에 모두 옮기는 방식은 경로 기반 하네스·인가 생성물·출처 기록까지 이관해야 한다. 이번에는 원본 소스 위치를 보존하여 출력 변환의 범위를 줄인다.
- 선택형 출력은 두 빌드 형태의 의존성·실행 task·검증 경로를 함께 유지하는 비용이 든다. 단일 project에서도 검증용 source set이 있으므로 단일 소스 폴더 구조와는 다르며 이를 인수 문서에 명시한다.

## 검증과 후속 범위

이 ADR의 Accepted 상태는 출력 선택에 대한 사용자 결정을 기록한다. 구현 완료, 실제 생성물 검증 통과, 운영 배포 또는 기관 승인을 뜻하지 않는다.

구현의 완료 판정은 두 레이아웃 각각의 생성 lock, Gradle 프로젝트 목록, 적용 소스·테스트 컴파일, 하네스, 실제 PostgreSQL 스키마 검사와 프론트 검증 결과를 사용한다. 요청과 다른 레이아웃, 게이트 누락, 클래스패스 경계 침범은 실패하는지도 확인한다. 검증 결과는 실행 보고서로 남기며 이 문서에 진행률을 기록하지 않는다.

임의 업무 기능 조합, 기능별 메뉴·권한 seed, 공통 구성 해석기, 선택 UI와 추가 DB는 [상세 설계](../project-composer-design.md)의 후속 범위다. 이 ADR은 그 설계 전체를 구현 완료 또는 운영 승인으로 승격하지 않으며, ADR-0001의 누적 프로필·릴리스 태그·원본 모듈 정책을 대체하지 않는다.

실행 계약의 현재 원본은 [소스 생성기](../../../scripts/generate-reusable-base-source.mjs), [레이아웃 값](../../../scripts/reusable-layout.mjs), [단일모듈 어댑터](../../../scripts/reusable-single-module.mjs), [산출물 검증기](../../../scripts/verify-reusable-artifact.mjs), [프로필 manifest](../../../config/reusable-base-profiles.json)에서 확인한다.
