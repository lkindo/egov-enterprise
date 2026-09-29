# ADR-0026 — CI 임계 경로 병렬화와 재사용 프로필 영향 선별

- 상태: Accepted
- 결정일: 2026-09-29
- 승인 범위: 사용자가 요청한 CI/CD 최적화 목표(검증 강도 유지, 중앙값 12분 이하)
- 관련: [ADR-0023](ADR-0023-e2e-impact-selection-and-cache-writer.md), [CI 가이드](../../03-guides/cicd-pipeline.md)

## 맥락

최근 성공한 전체 실행 8건의 중앙값은 약 17분 16초였다. `migration-scope`와 이관 PIT는 약 16분,
`backend-scope`는 약 13분 30초였다. 재사용 6개 matrix는 합계 약 47 runner-minutes를 사용하지만
가장 긴 한 잡은 약 11분이라 전체 임계 경로보다 짧다. 따라서 재사용 검증을 무조건 줄이면 비용은
절약해도 전체 대기시간은 거의 줄지 않는다.

재사용 생성기는 추적 파일을 산출물에 복사한 뒤 profile별 Java·프런트·DB 투영을 수행한다. 공용 소스나
미분류 입력을 일반 변경이라는 이유로 생략할 수 없다. 반면 `business-app`의 pack 소유 도메인과 manifest의
프런트 `removePaths`는 해당 pack이 없는 profile 산출물에서 제거되므로 영향 profile을 증명할 수 있다.

온라인 빌드·커버리지와 PostgreSQL 물리 스키마 검증은 같은 `backend-scope`에서 직렬 실행됐지만 산출물을
서로 소비하지 않는다. 두 결과를 안정 required context가 각각 집계하면 검증 의미를 유지하면서 병렬화할 수 있다.

## 결정

1. `change-scope`는 `reusable`과 `reusable-matrix`를 출력한다. pack 소유가 증명된 backend domain 또는
   frontend 제거 경로는 그 pack을 포함하는 profile×두 layout만 선택한다. 공용·복합·미분류 입력과 비교 불가
   상태는 core·collaboration·demo의 두 layout 전부로 돌아간다. 문서 전용 변경은 기존처럼 생략한다.
2. `reusable-base`는 분류기가 만든 `include` matrix만 실행한다. `backend-build`는 분류 결과와 실제 job 결과를
   계속 fail-closed로 집계한다. profile 선별은 required 검증을 main 이후로 옮기지 않는다.
3. 물리 스키마 검증을 읽기 전용 Gradle cache를 쓰는 `backend-schema-scope`로 분리한다. 이 잡과
   `backend-scope`는 둘 다 `change-scope` 직후 시작하며, `backend-build`는 backend·schema·migration·reusable
   네 source의 기대 실행 또는 명시적 skip을 각각 검사한다.
4. backend·schema·migration 잡은 JUnit XML의 suite 시간을 step summary로 남긴다. migration XML은 14일
   artifact로 보존해 DB vendor 샤딩을 실제 class 시간으로 설계한다. 이미지 pull은 별도 step으로 유지해
   다운로드와 컨테이너 초기화·테스트 시간을 혼동하지 않는다.
5. PIT history와 migration vendor 샤딩은 이번 변경에서 required 경로에 적용하지 않는다. history가 full PIT와
   같은 변이 모집단·상태·점수를 내는지, migration 샤드가 JaCoCo 85/70 집계를 보존하는지 먼저 측정한다.
   full PIT, 전체 migration, required context 6개와 품질 임계값은 유지한다.

## 검증과 한계

분류기 계약은 demo 전용, collaboration+demo, 공용 입력, 복합 입력, unknown/full fallback을 고정한다.
required-check 계약은 schema source나 reusable source의 조건·실행·집계 연결을 끊으면 실패한다. governance
registry는 schema-validation의 실제 CI job을 정확히 가리킨다.

정적 계약 통과는 실행시간 개선의 증거가 아니다. 병합 전후 동일 범주의 성공 실행을 비교해 전체 wall-clock,
각 source job, reusable runner 합계와 p95를 다시 측정한다. 12분 목표를 달성하지 못하면 수집한 JUnit evidence로
migration 샤딩을 설계하고, PIT history는 별도 shadow 비교가 full 결과와 동등할 때만 required 적용을 검토한다.
