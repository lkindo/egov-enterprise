# ADR-0011 — 익명 만족도와 비밀번호 소유 증명을 퇴역한다

**Status:** Accepted

**Date:** 2026-09-05

**Deciders:** lkindo (repository owner · product owner · API/security owner)

**Related:** [ADR-0009](ADR-0009-controlled-url-search-state.md), [백엔드 헌법 제8조·제11조](../../../.agent/knowledge/backend-api-constitution/artifacts/constitution.md)

**Origin:** `GAP-SEC-002` (이 결정과 구현·회귀 게이트로 해소했으며 상세 변경 이력은 Git에 보존)

## Context

만족도 API는 모든 공개 컨트롤러 경로에 인증을 요구하지만, 도메인과 요청 계약에는 과거 익명 사용을 전제로 한 두 번째 소유 증명 체계가 남아 있다. 생성 요청의 `pswd`를 해시해 저장하고, 작성자 감사 값이 없는 행은 수정 요청 body 또는 삭제 query의 `pswd`로 소유를 증명한다. 삭제 계약은 `DELETE .../satisfactions/{dgstfnSn}?pswd=...` 형태라 호출하면 브라우저 이력과 프록시·WAF·서버 access log 등 request-target 관측 지점에 자격증명이 남을 수 있다.

현재 제품은 만족도 목록·평균·생성·수정·삭제를 인증 사용자에게만 제공한다. 정상 생성 경로에는 로그인 주체의 감사 식별자가 기록되므로 익명 비밀번호 분기는 새 행에서 도달하지 않는다. 반면 이 휴면 분기를 보존하면 다음 비용이 계속된다.

- 인증 주체와 비밀번호라는 두 소유권 모델을 컨트롤러·DTO·서비스·엔티티·OpenAPI·클라이언트 전반에 유지해야 한다.
- 일반 개인정보성 업무 검색어만 제한적으로 허용한 ADR-0009와 달리, 소유 증명 자격이 URL query에 노출된다.
- 작성자가 없는 레거시 행에 입력한 비밀번호가 정말 적법한 소유자를 뜻하는지 현재 제품의 인증·감사 모델로 설명하기 어렵다.
- 사용되지 않는 익명 경로가 이후 우연히 다시 도달 가능해지면 검증·인가 경계가 조용히 달라질 수 있다.

## Decision drivers

- 만족도의 생성·수정·삭제 소유권을 현재 인증·감사 모델 하나로 단순화한다.
- 자격증명 또는 소유 증명 비밀을 URL request-target에 두지 않는다.
- 일반 사용자 삭제는 작성자 본인에게, 관리 작업은 관리자에게만 허용하고 서비스 계층에서 다시 검증한다.
- 작성자 없는 레거시 행에 소유자를 추측하거나 비밀번호만으로 일반 사용자 권한을 복원하지 않는다.
- 물리 컬럼 삭제와 기존 데이터 파기는 별도의 DB 변경·승인·롤백 판단으로 분리한다.

## Considered options

1. **현행 query 비밀번호를 유지** — 호환성은 유지하지만 URL 자격증명 노출과 이중 소유권 모델도 유지되어 선택하지 않았다.
2. **익명 기능을 유지하되 목적 전용 JSON body로 이전** — request-target 노출은 줄지만 현재 제품에 필요하지 않은 익명 소유권 모델과 비밀번호 수명·복구·rate-limit 계약을 계속 유지해야 하므로 선택하지 않았다.
3. **익명 만족도와 비밀번호 증명을 퇴역하고 인증 owner/admin만 허용** — 현재 도달 가능한 제품 경계와 일치하고 불필요한 자격증명 surface를 제거하므로 선택했다.

## Decision

1. 만족도 생성·수정·일반 삭제는 인증된 사용자만 수행한다. 익명 만족도 생성과 비밀번호 기반 수정·삭제는 지원하지 않는다.
2. 일반 수정·삭제는 저장된 작성자 감사 식별자와 현재 인증 주체를 비교해 **owner-or-admin**으로 판정하고, 서비스 계층에서 재검증한다. 요청 body나 query의 `pswd`는 소유권 증거로 사용하지 않는다.
3. 일반 삭제 API의 경로와 HTTP method는 유지하되 `pswd` query parameter를 제거한다. 서버는 이 query를 선언·binding·소비하지 않고 OpenAPI·생성 클라이언트·프론트 서비스도 이를 계약화하거나 생성하지 않는다. 백엔드 전역 request-target 경계는 금지된 credential-like **query 이름**을 발견하면 값을 읽거나 로그하지 않고 요청을 `400 Bad Request`로 거부한다. path·query parameter 선언의 금지 이름은 정적 API 계약이 별도로 차단한다.
4. 만족도 요청 DTO와 엔티티 애플리케이션 매핑에서 익명 소유 증명용 `pswd`를 제거하고, 생성 시 해시 저장·수정 시 비밀번호 검증·`checkPassword` 경로와 그 전용 암호화 의존성을 제거한다. 응답에서도 비밀번호 필드는 제공하지 않는다.
5. 작성자 감사 식별자가 없는 레거시 행은 일반 사용자의 수정·삭제 대상으로 간주하지 않는다. 소유자를 추측하거나 과거 비밀번호로 접근을 복원하지 않고, 기존 관리자 moderation 경로에서만 명시적으로 처리한다.
6. 관리자 moderation 경로는 관리 의도를 드러내는 별도 경로와 관리자 인가·서비스 재검증을 유지한다. 일반 경로의 owner-or-admin 허용과 별개로 이 경로를 익명 호환 우회로 사용하지 않는다.
7. 물리 DB의 기존 `pswd` 컬럼과 저장 값은 이번 API 정리에서 즉시 삭제·변경하지 않는다. 롤백 가능성과 기존 데이터 보존을 위해 미사용 상태로 두며, 컬럼 삭제·데이터 파기는 live schema/data 실측, 보존 요건과 별도 사용자 승인을 거친 후속 DB 결정으로 수행한다.
8. 자격증명·세션 비밀·인증/복구 토큰·일회용 코드·소유 증명 비밀은 HTTP path 또는 query parameter로 새로 설계하지 않는다. 별도 비밀 증명이 실제로 필요한 제품은 독립 결정과 위협 검토 후 보호된 request body 등 목적 전용 계약을 사용한다.

## Consequences

### Positive

- 만족도 소유권이 인증 주체와 작성자 감사 값의 단일 모델로 수렴한다.
- 지원되는 서버·OpenAPI·프론트 계약에서 만족도 비밀번호 URL이 사라지고, 임의 클라이언트가 금지된 credential-like query 이름을 붙인 요청도 애플리케이션 진입 경계에서 fail-closed로 거부된다.
- DTO·서비스·엔티티·OpenAPI·클라이언트의 휴면 익명 분기와 암호화 의존성을 제거할 수 있다.
- 작성자 없는 행에 일반 사용자 권한을 임의로 부여하지 않아 인가 의미가 fail-closed로 유지된다.

### Costs and risks

- `pswd` query를 직접 사용하던 외부·레거시 호출자는 호환되지 않는다. 현재 제품이 이 호출자를 지원하지 않는다는 결정을 명시적으로 수용한다.
- 작성자 없는 레거시 행은 일반 사용자에게 수정·삭제 불가능하며 관리자의 명시적 moderation이 필요하다.
- 물리 `pswd` 컬럼과 과거 값은 후속 DB 결정 전까지 남는다. 이는 요청 surface가 아니라 데이터 수명·스키마 부채이며 별도 실측과 파기 승인이 필요하다.
- 일반 삭제와 moderation 양쪽에서 관리자가 삭제할 수 있으므로, 운영자는 사용자 요청에 따른 삭제와 관리 조치를 경로·감사 기록으로 구분해야 한다.
- 애플리케이션의 `400` 거부는 request-target이 reverse proxy·WAF·CDN 또는 servlet container에 도달한 뒤 일어난다. 따라서 임의 클라이언트가 보낸 URL이 애플리케이션 앞단의 access log에 남을 가능성까지 제거하지 못하며, 배포자는 query redaction·보존·접근 통제를 별도로 적용해야 한다.

## Non-goals

- ADR-0009가 허용한 일반 개인정보성 업무 검색어의 URL 정책을 축소하거나 철회하는 것
- 만족도 테이블의 물리 `pswd` 컬럼을 이번 변경에서 삭제하거나 기존 값을 일괄 파기하는 것
- 작성자 없는 레거시 행에 새 소유자를 backfill하는 것
- 관리자 moderation의 역할 체계나 감사 보존 정책을 재설계하는 것
- 다른 도메인의 기존 비밀번호 필드나 인증 API를 일괄 변경하는 것

## Validation

- 컨트롤러 계약은 일반 삭제가 인증을 요구하고 `pswd` query를 선언·binding·소비하지 않으며 현재 로그인 주체로 서비스를 호출하는지 검증한다.
- 서비스 단위 테스트는 owner와 admin은 수정·삭제할 수 있고 비소유자 및 작성자 없는 레거시 행은 거부되며, 관리자 moderation만 작성자 없는 행을 처리할 수 있음을 검증한다.
- API 계약 생성과 프론트 타입 검증은 만족도 생성·수정·삭제 요청 surface에서 `pswd`가 사라지고 프론트 삭제 호출이 query를 만들지 않음을 검증한다.
- [`credential-request-target-source-contract.test.mjs`](../../../scripts/credential-request-target-source-contract.test.mjs)는 Java의 credential-name 정책을 SSOT로 읽어 프론트 production TS/TSX의 명시적 query·params·`URLSearchParams`·request URL producer를 검사하며, 합성 `pswd` producer가 red가 되는지 확인한다.
- 백엔드 정적 API 계약은 자격증명 또는 소유 증명 이름의 path/query parameter가 다시 추가되면 red가 되도록 검사한다. 런타임 필터 계약은 금지 이름을 가진 query 요청이 값의 판독·로그 없이 `400`으로 수렴하고, 일반 검색어와 유사하지만 허용된 이름은 통과함을 검증한다. 합성 위반으로 정적 negative gate의 red 동작도 확인한다.
- 물리 DB 컬럼은 이 ADR의 애플리케이션 계약 검증 대상에서 제외한다. 제거 시점에는 live `information_schema`·데이터 보존 판단·Flyway 검증을 갖춘 별도 변경으로 다룬다.
