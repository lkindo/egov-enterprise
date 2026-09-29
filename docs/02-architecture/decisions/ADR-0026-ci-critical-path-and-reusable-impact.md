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

PIT를 14개 scope로 나누고 제품 동시 실행을 5개로 높인 [2차 전체 실행 36557162092](https://github.com/lkindo/egov-enterprise/actions/runs/36557162092)은
17분 21초였다. 제품 `business-app` 세 scope는 5분 24초~7분 6초로 줄었지만 `TypeConverter` 16분 36초,
`migration-scope` 16분, 이관 verify 13분 3초가 임계 경로로 남았다. 따라서 class scope 분할만으로도 목표를
달성하지 못했으며, 이관 테스트의 병렬 실행과 PIT의 실제 killing test 선택을 추가로 검증했다.

같은 실행의 PIT 보고서는 `business-app` 1,279개 변이를 겹침 없는 세 대상 집합으로 나눌 수 있음을 보였다.
board는 489개 중 426개(87.12%), workflow는 460개 중 369개(80.22%), delivery/operation은 330개 중
298개(90.30%)를 탐지했다. 이관 transform은 `TransformerRegistry` 39/39, `TypeConverter` 30/35였고,
validate·verify 패키지는 각각 220개와 162개 변이를 생성했고, no-coverage를 제외한 test strength는 각각
92%와 97%였다. 모든 집합이 기존 75% 하한을 독립적으로 넘는다.
Oracle crash-recovery 시험은 별도 JVM에서 일반 classpath/JAR를 실행했고 transform·validate/verify 보고서에서
탐지한 변이가 0개였다. 이 근거는 history 재사용 없이 동일 모집단을 결정적으로 분할할 수 있게 한다.

## 결정

1. `change-scope`는 `reusable`과 `reusable-matrix`를 출력한다. pack 소유가 증명된 backend domain 또는
   frontend 제거 경로는 그 pack을 포함하는 profile×두 layout만 선택한다. 공용·복합·미분류 입력과 비교 불가
   상태는 core·collaboration·demo의 두 layout 전부로 돌아간다. 문서 전용 변경은 기존처럼 생략한다.
2. `reusable-base`는 분류기가 만든 `include` matrix만 실행한다. core가 선택되면 두 layout의 custom composition은
   별도 `reusable-custom` matrix에서 profile 생성과 병렬 실행한다. `backend-build`는 두 job의 기대 실행과 실제
   결과를 각각 fail-closed로 집계한다. profile 선별이나 custom 분리는 required 검증을 main 이후로 옮기지 않는다.
3. 물리 스키마 검증을 읽기 전용 Gradle cache를 쓰는 `backend-schema-scope`로 분리한다. 이 잡과
   `backend-scope`는 둘 다 `change-scope` 직후 시작하며, `backend-build`는 backend·schema·migration·reusable
   profile·custom source의 기대 실행 또는 명시적 skip을 각각 검사한다.
4. backend·schema·migration 잡은 JUnit XML의 suite 시간을 step summary로 남긴다. migration XML은 14일
   artifact로 보존해 DB vendor 샤딩을 실제 class 시간으로 설계한다. 이미지 pull은 별도 step으로 유지해
   다운로드와 컨테이너 초기화·테스트 시간을 혼동하지 않는다.
5. PIT history는 required 경로에 적용하지 않는다. 이전 판정 재사용이 full PIT와 같은 상태를 낸다는 shadow
   증거가 없기 때문이다. 대신 위 보고서의 겹침 없는 클래스 집합으로 제품 `business-app`을 3개, 이관
   transform/validate/verify를 4개 scope로 분할한다. 이관 네 scope의 `targetTests`는 기존 full-test 보고서에서
   실제 killing test로 관찰된 2~3개 클래스로 고정한다. 각 scope에 `STRICT_MUTATION=true`와 75%를 독립 적용하고,
   registry와 CI의 정확한 합집합·scope 수를 계약으로 고정한다. 제품 scope는 총 10개가 되어 `max-parallel: 5`로
   실행한다. 기존 변이를 빼거나 history로 판정을 재사용하지 않는다.
6. 외부 JVM을 시작하는 DB crash/packaged CLI 시험 8개는 위 네 이관 scope에서만 제외한다. ordinary `test`와
   로컬 전체 `nuri.*` PIT에는 남긴다. 미등록 외부 프로세스 시험 추가, 광역 제외, ordinary Test 필터는 계약이
   실패시킨다. 이관 기능 시험과 JaCoCo 85/70은 `migration-scope`가 계속 전수 실행한다.
7. 성공한 run `36557162092`의 JUnit XML에서 발견한 123개 소스 테스트 클래스를 3개로 정확히 나누고,
   class별 시간을 LPT 방식으로 균형화한다. `migration-test-scope`의 세 matrix leaf는 각각 41개 클래스를 실행해
   XML census·manifest·JaCoCo `.exec`를 남긴다. 후속 `migration-scope`는 세 leaf 성공을 fail-closed로 집계하고,
   manifest·클래스·프로필 provenance·세 실행 파일을 검증한 뒤 기존 `jacocoMigrationCoverageVerification`에서
   실행 데이터를 병합한다. LINE 85%·BRANCH 70%, 로컬/주간 전체 테스트, required context 6개는 유지한다.

## 검증과 한계

분류기 계약은 demo 전용, collaboration+demo, 공용 입력, 복합 입력, unknown/full fallback을 고정한다.
required-check 계약은 schema source나 reusable source의 조건·실행·집계 연결을 끊으면 실패한다. governance
registry는 schema-validation의 실제 CI job을 정확히 가리킨다.

로컬 격리 실행에서 세 migration leaf는 8분 11초, 7분 39초, 7분 9초에 각각 41개 클래스 census를 통과했다.
세 `.exec`의 병합 커버리지는 27초에 기존 85/70 게이트를 통과했고, 두 파일만 제공한 부정 실행은 정확히 3개를
요구하며 실패했다. 정밀화한 이관 PIT 네 scope는 각각 13초, 13초, 32초, 35초였고 변이 모집단 39·35·220·162개가
기존 보고서와 정확히 같았다. registry·validate·verify 상태도 같았으며 TypeConverter 한 건은 `TIMED_OUT`에서
`SURVIVED`로 바뀌어 종전 timeout의 불명확한 탐지를 실제 생존 변이로 더 엄격하게 드러냈다. test strength 97%와
75% 하한은 유지한다.

이 로컬 결과는 Linux runner 준비·캐시·대기를 포함하지 않는다. 변경 SHA의 required CI에서 14개 PIT scope와
세 migration leaf 및 aggregate가 모두 성공하고 전체 wall-clock을 다시 측정해야 12분 목표 달성을 판정한다.
PIT history는 shadow 비교가 full 결과와 동등할 때만 required 적용을 검토한다.

[3차 전체 실행 36566919897](https://github.com/lkindo/egov-enterprise/actions/runs/36566919897)은 세 migration leaf가
6분 0초·6분 50초·7분 23초, 이관 PIT 네 scope가 1분 22초~1분 53초로 끝나 종전 병목 제거를 확인했다. 다만
aggregate가 shallow checkout에서 측정 commit을 찾지 못해 실패했고, `reusable-base core/single`은 profile 6분 38초와
custom 5분 52초를 직렬 실행해 12분 58초가 걸렸다. aggregate와 leaf는 provenance 검사를 위해 전체 이력을 받고,
profile/custom은 위 결정대로 병렬 job으로 분리한다. 이 실행은 실패 표본이므로 목표 달성 근거로 쓰지 않는다.
