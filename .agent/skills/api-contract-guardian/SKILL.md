---
name: api-contract-guardian
description: Backend DTO 또는 Controller의 외부 계약 변경이 OpenAPI, 생성 TypeScript/Zod, 프런트 소비 코드와 함께 안전하게 바뀌는지 검증한다.
version: 2.0.0
---

# API Contract Guardian

## 사용 시점

REST Controller, 외부 요청·응답 DTO, 공통 응답, 예외 매핑 또는 OpenAPI 스키마를 바꿀 때 사용한다.

## 정본과 경계

- 공통 규칙: `AGENTS.md`와 백엔드 헌법
- 응답 구현: `foundation/src/main/java/nuri/foundation/core/response/ApiResponse.java`
- 오프라인 명세: `api-docs.json`
- 생성물: `frontend/src/types/generated-api.d.ts`, `generated-zod.ts`
- 절차: `docs/03-guides/api-documentation-guide.md`

일반 JSON API는 `ApiResponse<T>` 계약을 지킨다. 바이너리 download·stream·SSE처럼 wrapper가 부적합한 응답은 자동 변환하지 않는다. 현재 헌법에 예외 근거가 없으면 구현을 임의 정규화하지 말고 gap과 승인 필요성을 보고한다.

## 검증 절차

1. 변경 전후 DTO 필드·타입·nullable·validation·HTTP status를 비교한다.
2. DB 컬럼을 반영한 DTO라면 대상 환경의 live 메타와 물리 제약을 확인한다. 접근할 수 없으면 저장소 Flyway만 확인했다는 한계를 남긴다.
3. 기본 경로인 오프라인 codegen을 실행한다.

```bash
pnpm -C frontend codegen:file
pnpm -C frontend codegen:zod
pnpm -C frontend codegen:verify
pnpm -C frontend codegen:verify:zod
pnpm -C frontend type-check
```

서버가 실제로 기동된 작업에서만 `pnpm -C frontend codegen:ts`를 선택한다. stale `api-docs.json`을 임의 생성하거나 npm lockfile을 만들지 않는다.

4. 제거·rename·타입 축소·optional→required 변경은 breaking change로 분류하고 실제 프런트 소비자를 검색한다.
5. 호환 계층, 프런트 동시 수정, 버전 전환 중 하나를 선택하고 그 근거를 보고한다.
6. 변경 범위에 맞는 백엔드 계약 테스트와 프런트 검증을 실행한다.

## 금지 사항

- 테스트를 통과시키기 위해 응답 필드나 validation을 약화하지 않는다.
- Entity, `Map<String,Object>`, raw response를 증거 없이 자동 DTO 변환하지 않는다.
- 다운로드·stream 응답을 일반 JSON wrapper로 기계 치환하지 않는다.
- codegen 성공만으로 런타임 호환 또는 DB 정합성을 보장했다고 표현하지 않는다.

## 보고 형식

대상 endpoint, 변경된 계약, breaking 여부, 실제 소비자, 실행한 검증, 남은 한계를 간결하게 기록한다. 검증하지 않은 항목을 “완전 동기화”라고 쓰지 않는다.
