# 프로젝트 안전 삭제 가이드

파일·모듈·문서를 제거할 때 단순 문자열 참조 수만으로 “미사용”을 판정하지 않는다. 프레임워크 자동 배선, 문자열 라우팅, 빌드 산출물, DB 메타데이터처럼 정적 import 검색에 나타나지 않는 소비 경로를 자산 종류별로 확인한다.

상위 안전 규칙은 [AGENTS.md](../../AGENTS.md), 현재 제품 경계는 [ADR-0001](../02-architecture/decisions/ADR-0001-core-app-product-boundary.md), 변경 범위별 검증은 [테스트 가이드](../03-guides/testing-guide.md)를 따른다.

## 1. 삭제 판정 원칙

- **정본을 먼저 찾는다.** 생성물이나 복제본이 아니라 원본 설정·소스·ADR을 기준으로 판단한다.
- **소비 경로를 자산별로 찾는다.** import 0건은 삭제 가능성의 한 신호일 뿐 증명이 아니다.
- **대체 경로를 확인한다.** 기능·문서·운영 절차가 다른 정본으로 실제 이관됐는지 확인한다.
- **회귀 증거를 남긴다.** 삭제 뒤 compile·test·runtime discovery가 red가 아님을 변경 범위에 맞게 검증한다.
- **불확실하면 격리한다.** 즉시 영구 삭제하지 말고 deprecation, feature flag, tombstone 문서 또는 별도 승인 단계로 좁힌다.

## 2. 자산별 소비 경로

| 자산 | import 검색 외에 확인할 경로 | 대표 검증 |
|---|---|---|
| Next.js `page.tsx`·route | `Link`, `router.push`, redirect, 메뉴 DB의 route 문자열, 직접 URL | route 목록·관련 Playwright spec |
| React component·hook·type | barrel export, dynamic import, story/test glob | TypeScript, Vitest, frontend build |
| Spring bean·controller | component scan, DI, `@RequestMapping`, event/listener, scheduler, filter chain | module compile, Spring context, 표적 MockMvc |
| Spring Data 구현 | repository fragment 명명 규약과 auto binding | repository 통합 테스트 |
| JPA Entity·converter | persistence scan, reflection, Flyway schema | `schemaValidationTest`, 관련 write-smoke |
| 설정·리소스 | profile overlay, classpath lookup, Docker/CI copy, environment binding | 활성 profile별 기동·config 계약 |
| Flyway SQL | 적용 이력과 checksum, repeatable migration 소비 | 적용된 versioned migration은 수정·삭제 금지 |
| 스크립트·workflow | package/Make/Gradle entry, 훅, CI action, 운영 runbook | 명령 dry-run 또는 contract test |
| 문서 | Markdown/HTML 링크, 코드 주석, 에이전트 진입점 | `docs-link-integrity`, 해당 docs-as-code 계약 |
| 생성 결과·리포트 | generator와 artifact upload 규칙, ignore 정책 | 재생성 가능성과 직접 소비자 0건 확인 |

## 3. 삭제 준비 절차

1. 대상의 tracked 상태와 정확한 경로를 확인한다.
2. `rg`와 `git grep`으로 파일명·심볼·URL·설정 키를 검색한다.
3. 프레임워크·런타임·CI의 간접 소비 경로를 위 표에 따라 확인한다.
4. 대체 정본과 남겨야 할 지식을 정한다. 사건 이력만 필요하면 Git 기록으로 충분한지 판단한다.
5. 삭제 영향 범위를 최소 단위로 나누고, 소비 링크와 인덱스를 같은 변경 세트에 포함한다.
6. 변경 범위에 맞는 compile·test·문서 계약을 실행한다.
7. 실행하지 못한 외부 검증은 `not-run` 또는 `blocked-external`로 보고한다.

예시 검색:

```bash
rg -n "TargetName|target/path|/target-route" .
git grep -n "TargetName"
git ls-files "*target*"
```

## 4. 문서 수명주기 판정

다음 조건을 모두 만족하면 문서를 삭제 후보로 분류할 수 있다.

- 본문 대부분이 날짜별 사건·완료 체크리스트·일회성 수치다.
- 활성 결정이나 미해결 위험이 현행 ADR·pending registry·known gap으로 이관됐다.
- 다른 문서와 코드 주석의 소비 링크가 대체 정본으로 변경됐다.
- 해당 문서만 보유한 안정적인 운영 절차나 제품 요구가 없다.

적용된 Flyway 주석처럼 수정할 수 없는 소비자가 남으면 hard delete보다 짧은 **tombstone**을 유지한다. tombstone에는 “비정본” 상태, 대체 정본, 삭제할 수 없는 이유만 남기고 과거 실행 로그를 복제하지 않는다.

## 5. 완료 증거

삭제 작업 보고에는 다음을 남긴다.

- 제거한 정확한 경로와 대체 정본
- 정적·간접 소비자 조사 결과
- 실행한 검증 명령과 결과
- 복구 방법 또는 Git에서 복원 가능한 commit
- 의도적으로 남긴 tombstone·deprecation과 종료 조건

“참조 0건”, compile 성공 또는 에이전트의 추정 하나만으로 안전 삭제 완료를 선언하지 않는다.
