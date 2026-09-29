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

1차 변경의 [전체 실행 36550933968](https://github.com/lkindo/egov-enterprise/actions/runs/36550933968)은 21분 4초였고,
병렬화된 `backend-scope` 3분 2초와 `backend-schema-scope` 6분 50초는 종전 직렬 구간을 줄였다. 반면
`migration-scope`는 14분 11초, 제품 `business-app` PIT는 14분 54초, 이관 transform PIT는 15분 53초,
validate/verify PIT는 20분 26초로 남았다. 제품 PIT의 동시 실행 상한 3 때문에 뒤쪽 scope는 최대 6분 58초
대기했다. 따라서 첫 변경만으로 12분 목표를 달성했다고 볼 수 없다.

같은 실행의 PIT 보고서는 `business-app` 1,279개 변이를 겹침 없는 세 대상 집합으로 나눌 수 있음을 보였다.
board는 489개 중 426개(87.12%), workflow는 460개 중 369개(80.22%), delivery/operation은 330개 중
298개(90.30%)를 탐지했다. 이관 transform은 `TransformerRegistry` 39/39, `TypeConverter` 30/35였고,
validate·verify 패키지는 각각 195/218, 135/155였다. 모든 집합이 기존 75% 하한을 독립적으로 넘는다.
Oracle crash-recovery 시험은 별도 JVM에서 일반 classpath/JAR를 실행했고 transform·validate/verify 보고서에서
탐지한 변이가 0개였다. 이 근거는 history 재사용 없이 동일 모집단을 결정적으로 분할할 수 있게 한다.

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
5. PIT history는 required 경로에 적용하지 않는다. 이전 판정 재사용이 full PIT와 같은 상태를 낸다는 shadow
   증거가 없기 때문이다. 대신 위 보고서의 겹침 없는 클래스 집합으로 제품 `business-app`을 3개, 이관
   transform/validate/verify를 4개 scope로 분할한다. 각 scope에 `STRICT_MUTATION=true`와 75%를 독립 적용하고,
   registry와 CI의 정확한 합집합·scope 수를 계약으로 고정한다. 제품 scope는 총 10개가 되어 `max-parallel: 5`로
   실행한다. 기존 변이를 빼거나 history로 판정을 재사용하지 않는다.
6. 외부 JVM을 시작하는 DB crash/packaged CLI 시험 8개는 위 네 이관 scope에서만 제외한다. ordinary `test`와
   로컬 전체 `nuri.*` PIT에는 남긴다. 미등록 외부 프로세스 시험 추가, 광역 제외, ordinary Test 필터는 계약이
   실패시킨다. 이관 기능 시험과 JaCoCo 85/70은 `migration-scope`가 계속 전수 실행한다.
7. `migration-scope` 자체의 vendor 샤딩은 JaCoCo 집계를 보존하는 설계와 red 증명 전에는 required 경로에
   적용하지 않는다. required context 6개와 기존 품질 임계값을 유지한다.

## 검증과 한계

분류기 계약은 demo 전용, collaboration+demo, 공용 입력, 복합 입력, unknown/full fallback을 고정한다.
required-check 계약은 schema source나 reusable source의 조건·실행·집계 연결을 끊으면 실패한다. governance
registry는 schema-validation의 실제 CI job을 정확히 가리킨다.

정적 계약 통과와 과거 보고서의 산술 분할은 새 샤드의 실행시간 개선 증거가 아니다. 변경 SHA의 required CI에서
14개 PIT scope가 모두 성공하고 전체 wall-clock·각 source job·runner 대기를 다시 측정해야 한다. 첫 실행에서
`migration-scope`가 14분 11초였으므로 12분 목표는 아직 미달 상태다. 새 PIT 실행 뒤에도 이 잡이 임계 경로면
수집한 JUnit class 시간을 이용해 JaCoCo 합집계를 보존하는 migration 샤딩을 별도로 설계한다. PIT history는
shadow 비교가 full 결과와 동등할 때만 required 적용을 검토한다.
