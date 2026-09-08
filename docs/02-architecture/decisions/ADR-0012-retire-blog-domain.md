# ADR-0012 — 비사용 블로그 도메인을 제거한다

**Status:** Accepted

**Date:** 2026-09-08

**Deciders:** lkindo (repository owner · product owner)

**Supersedes:** `DEC-OPS-072`의 블로그 현 상태 유지 결정과 `DEC-OPS-047`의 블로그 템플릿 참조 기여자 유지 부분. 커뮤니티 회원 전용 게시판과 게시판의 템플릿 참조 차단은 유지한다.

**Origin:** 사용자 명시 요청 “블로그 도메인을 모두 제거해줘”. `GAP-BLOG-001`의 제품 범위를 이 결정으로 종료한다.

## Context

블로그는 엔티티·리포지토리·사용자 삭제 리스너·템플릿 참조 기여자와 게시판의 귀속 필드를 보유하지만, 블로그를 생성하거나 관리하는 서비스 CRUD·컨트롤러·화면은 없다. 종전에는 이 모델을 보존하기로 했으나 사용자가 도메인 전체 제거를 명시적으로 요청했다.

2026-09-08 OCI 읽기 전용 실측에서 `tb_blog_info`와 `tb_blog_user_map`은 모두 0행이고, `tb_bbs_item.blog_sn`·`tb_bbs_master.blog_sn`의 값 및 `tb_bbs_master.blog_yn='Y'`인 행도 0건이었다. 관련 FK는 블로그 회원 매핑의 블로그·사용자 참조뿐이다. 이 확인은 해당 환경의 비사용 상태에 대한 근거이며, 다른 환경에서도 데이터가 없다는 보증은 아니다.

## Decision

1. 블로그의 생산 Java 패키지와 런타임 구현 전용 테스트, 사용자 삭제 리스너, 템플릿 참조 기여자를 제거한다. 게시판의 블로그 귀속·유형 필드도 Entity·DTO·OpenAPI·프론트 생성 계약·생산 호출부에서 제거한다. 과거 스키마 변환을 검증하는 migration 테스트는 해당 시점의 스키마를 대상으로 보존할 수 있다.
2. 재사용 base의 모든 profile에서 블로그 도메인과 `tb_blog_info`·`tb_blog_user_map`을 제외한다. `WebLog`·`tb_web_log`는 웹 접속 로그 도메인이므로 이 결정의 제거 대상이 아니다.
3. DB는 새 Flyway migration으로 종료한다. [V2_89](../../../api-server/src/main/resources/db/migration/V2_89__fence_retired_blog_writes.sql)는 블로그 신규 행·귀속 쓰기를 제약으로 차단하면서 기존 컬럼 읽기를 보존한다. [V2_90](../../../api-server/src/main/resources/db/migration/V2_90__retire_blog_domain.sql)은 대상 잠금을 `NOWAIT`로 확보하고 비사용 상태를 재검사한 뒤 게시판의 세 블로그 컬럼과 블로그 두 테이블을 제거한다.
4. 제거 migration은 블로그 행·멤버십·게시판 귀속·활성 블로그 유형 중 하나라도 있으면 실패해야 한다. 데이터를 임의 삭제하거나 참조를 null로 바꾸어 검사를 통과시키지 않는다. 예상하지 않은 의존 객체도 `CASCADE`로 함께 제거하지 않는다.
5. 배포자는 컬럼 제거 전 블로그 필드를 참조하는 구버전 애플리케이션을 종료한다. 이번 결정은 비사용·0행 도메인의 종료이며, 시간 간격을 둔 호환성 관측이나 무중단 롤링 배포를 검증했다는 주장이 아니다.
6. 이미 적용된 `V2_0`·`V2_70` 등 과거 migration의 본문과 checksum은 보존한다. `BLOG_NM`·`BLOG_SN` 등 공유 표준 사전 항목도 과거 스키마 재현과 사전의 독립 수명 때문에 보존한다. 과거 ADR·결정·보관 문서는 변경 이력으로 남기고 현재 정책은 이 ADR로 연결한다.

## Consequences

- 지원하지 않는 제품 도메인의 모델·참조·테스트·배포 profile을 유지할 비용이 사라진다.
- 게시판·커뮤니티·사용자 삭제·템플릿 참조 차단에서 블로그를 제외한 동작은 기존 계약을 유지한다.
- 블로그 데이터를 가진 파생 환경은 제거 migration이 중단된다. 그 환경은 데이터 보존·이관 또는 별도 제품 유지 결정을 먼저 내려야 한다.
- 컬럼 제거 후 구버전 애플리케이션으로 되돌리는 것은 호환되지 않는다. 복원은 검증된 DB 백업과 대응 애플리케이션 버전을 함께 사용하는 절차가 필요하다.

## Validation

- 빈 PostgreSQL에 과거 migration부터 전량 적용하고 최종 스키마에서 두 테이블과 세 컬럼이 사라졌는지 검사한다.
- 블로그 데이터·게시판 참조를 의도적으로 넣은 경우 제거가 실패하고 기존 데이터가 보존되는지 부정 테스트한다.
- Entity·OpenAPI·생성 타입·생산 호출부의 블로그 계약이 제거됐는지 검증하고, 게시판·템플릿 삭제·사용자 삭제의 영향 테스트를 수행한다.
- 적용 환경에서는 쓰기 차단·제거 전 비사용 상태를 재확인하고, 적용 후 `information_schema`와 Flyway 이력을 조회한다. 단위 테스트의 H2 결과를 운영 스키마 증거로 대체하지 않는다.

## Related sources

- [공용 결정 인덱스](../../../.agent/memory/decisions.md)
- [DB 헌법](../../../.agent/knowledge/db-standard-constitution/artifacts/constitution.md)
- [재사용 profile](../../../config/reusable-base-profiles.json)
- [백업·복원 런북](../../04-operations/backup-and-restore-runbook.md)
