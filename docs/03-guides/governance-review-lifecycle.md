# 거버넌스 검토 수명과 기관 도입 가이드

일반 검토 일정이 지나도 동일한 코드·정책 계약은 같은 결과를 낸다. 정기 검토 상태는 실제 시계로 별도 보고하고, 기관 배포·이관은 해당 제품과 환경의 승인 원장으로 확인한다. 결정 정본은 [ADR-0018](../02-architecture/decisions/ADR-0018-governance-review-lifecycle-and-adoption.md)이다.

## 1. 세 가지 판정

| 판정 | 대상과 기준 | 실패·후속 작업 |
|---|---|---|
| 기술 계약 | 현재 소스, 정책, exact census, 승인 근거 | 실제 위반·변조·drift는 기존 기술 CI에서 실패 |
| 정기 검토 최신성 | 기록된 `reviewBy`·`checkBy`와 현재 시각 | 예정·기한 경과·미완료를 보고하고 책임자가 후속 검토 |
| 기관 사용 승인 | 제품·프로필·환경, 현재 scope digest, 통제별 evidence, 유효기간 | 미승인·대상 불일치·근거 오류·만료는 기관 preflight 실패 |

일반 일정은 URL-state census·승인 부류, route capabilities, UI quality, KRDS 매핑, 화면 용어를 다룬다. 기존 날짜와 검토자·근거는 보존하며 생성 명령이 날짜를 오늘로 바꾸거나 미검토 항목을 승인하지 않는다. 날짜 형식·검토 시점과의 순서·소유자·UI quality의 기록된 90일 상한은 기술 계약에서도 필요하다.

E2E shard 실행시간 profile의 120일 최신성도 정기 보고의 `performanceEvidence`에서 추적한다. 오래된 측정만으로 shard 계획이나 기술 CI를 중단하지 않는다. 성공 실행 provenance, 실제 spec 모집단, 양수 duration과 미래 시각 금지는 계속 검사한다. 오래된 값으로 계획한 shard의 균형이 현재 성능을 증명하는 것은 아니다.

SAST·ZDM·skip waiver 등 실제 예외의 기한과 인증 토큰·세션 수명은 이 변경의 대상이 아니다. 일반 일정과 같은 필드 이름을 쓴다는 이유로 다른 정책의 날짜 검사를 끄지 않는다.

## 2. 검토 상태 확인

저장소 루트에서 실행한다.

```bash
npm run review:status
npm run review:migration
```

`review:status`는 온라인 제품의 검토 상태를 JSON으로 출력한다. `review:migration`은 독립 이관 도구 범위를 보고하며 UI 검토를 도입 조건으로 가져오지 않는다. `sourceScope`는 `{product, profile, fileCount, digest}`를 제공한다. 보고는 현재 자료의 최신성을 드러내는 절차이며 일반 일정 경과만으로 기술 CI나 이미 실행 중인 화면을 중단시키지 않는다.

생산 저장소의 [예약 워크플로](../../.github/workflows/governance-review.yml)는 코드 변경이 없는 기간에도 같은 보고를 실행한다. 생산 저장소의 required `secret-scan` 보고 step·artifact도 같은 자료를 제공하며 기존 required context 6개를 유지한다. 이 예약 작업은 생성물에서 자동 활성화되지 않는다. 기관은 보고 일정과 배포 직전 검사를 자기 환경에 연결하고, 유효기간과 실제 사용 대상을 아래 preflight에서 다시 확인한다.

각 검토일은 해당 날짜를 포함한다. URL census·승인·route·화면 용어·KRDS는 UTC의 다음 날 00:00부터, UI quality는 Asia/Seoul의 다음 날 00:00부터 `overdue`다. 30일 이내 예정은 `due-soon`으로 구분한다. 형식 오류나 검토 모집단 소실은 보고 오류다.

보고의 `technicalValidation`은 `not-executed`이며 기술 테스트 실행을 대신하지 않는다. 기관 preflight의 `approvalEnvelopeValid`도 제출 원장의 정합 판정이다. `liveEnvironmentVerified: false`를 유지해 실제 환경 검증과 구분한다.

기한이 지난 항목은 소유자가 관련 소스·정책·운영 환경과 근거를 다시 검토한다. 검토한 범위와 결과를 기록한 뒤에만 일정·근거를 갱신한다. 미검토 상태와 `unmeasured`는 그대로 둘 수 있으며, 그것이 안전·측정 완료 판정으로 승격되는 것은 아니다. 일괄 날짜 연장이나 hash 재계산은 승인 행위가 아니다.

## 3. 온라인 제품의 기관 도입

기본 원장은 [adoption-review.json](../../config/governance/adoption-review.json)이며 `status: pending`으로 제공한다. 제품은 `online`, 프로필은 `core`·`collaboration`·`demo` 중 실제 산출물과 같아야 한다. 원본 제품의 승인 이력이 도입 기관 환경의 승인까지 대신하지 않는다.

| 필드 | 기록할 내용 |
|---|---|
| `environmentId` | 기관에서 구별 가능한 실제 대상 환경 식별자 |
| `owner` | 검토 결과에 책임지는 명명된 사람 또는 책임 역할 |
| `reviewedAt` | 실제 검토한 과거 UTC 시각 (`Z` 접미사) |
| `validUntil` | 해당 환경 사용 승인의 UTC 유효기간; 이 시각부터 기관 preflight 실패 |
| `scopeDigest` | `review:status`의 `sourceScope.digest`; 현재 제품·프로필의 소스·정책 범위 |
| `evidence` | 통제마다 `{control, path, sha256}` 하나씩; 경로는 저장소 내부의 실제 근거 파일 |

온라인 통제는 다음 다섯 가지다.

| control | 검토 내용 |
|---|---|
| `data-classification` | 실제 업무 데이터, 허용 URL 상태·검색 안내·입력 목적, 기관의 노출 허용 범위 |
| `authorization` | 실제 그룹·기능·메뉴·객체 접근과 허용/거부 결과 |
| `request-logging` | 프록시·WAF·앱·분석 도구의 수집 필드, 검색어 복제·보존·접근 정책 |
| `accessibility` | 기관 화면·사용자·지원 환경의 접근성 및 필요한 수동 평가 |
| `execution-artifacts` | 실제 실행 descriptor의 경로와 SHA-256; 배포할 API·프런트 이미지 digest를 명시 |

근거 파일에는 대상·검토 범위·결과·관측 시점과 필요한 후속 작업을 남긴다. 비밀·개인정보·원시 운영 로그는 넣지 않는다. 파일의 SHA-256은 내용 결속을 확인할 뿐, 검토 내용의 적절성이나 작성자의 신원을 자동 증명하지 않는다.

실제 원장을 검토·작성한 뒤 대상 환경을 명시해 확인한다.

```bash
npm run review:adoption -- --environment institution-staging
```

`institution-staging`은 명령 형식의 예시이므로 기관의 실제 `environmentId`로 바꾼다. 기본 `pending` 원장을 그대로 실행하면 실패하는 것이 정상이다. 빈 소유자·미래 검토 시각·누락/중복 통제·범위 digest 불일치·근거 파일 변경·유효기간 만료도 실패한다.

프로필은 실제 생성 산출물 metadata에서 확인한다. 원본 demo에 `--profile core`만 지정해 검증 범위를 줄일 수 없다. 기관용 core·collaboration을 검토하려면 해당 프로필을 먼저 생성하고 그 디렉터리에서 실행한다. 직접 CLI가 필요하면 `node scripts/governance-review.mjs --product online --mode adoption --environment institution-staging`를 사용한다.

이 명령은 원장 정합만 확인한다. 실제 배포 직전에는 아래 실행 진입점을 사용한다. 참조 프레임워크의 CI·릴리스는 임의 기관의 `pending`을 전역 차단 조건으로 사용하지 않는다. 개발·빌드 가능 여부와 기관 운영 승인 여부는 별도 결과다.

### 3.1 기관 실행 진입점

[adoption-execute.mjs](../../scripts/adoption-execute.mjs)는 기관 원장과 실행 대상을 먼저 확인하고 제품의 기술 검증을 실행한 뒤, 같은 원장·소스·대상·유효기간을 다시 확인한다. 기본 명령은 검사만 한다.

```bash
npm run adoption:check -- --execution config/governance/execution.json --environment institution-staging
```

기관이 작성하는 `execution.json`의 온라인 예시는 다음과 같다. 꺾쇠 안의 값은 실제 registry의 이미지 digest로 바꾼다. 온라인 실행은 해당 프로필의 `reusable-base-lock.json`이 있는 생성물에서만 허용한다.

시작 파일은 [online-execution.example.json](../../config/governance/online-execution.example.json)을 복사한다.
빈 예시는 승인된 실행물이 아니며 실제 값을 채우고 기관 검토를 받아야 한다.

```json
{
  "schemaVersion": 1,
  "product": "online",
  "profile": "core",
  "environmentId": "institution-staging",
  "images": {
    "api": "registry.example.org/institution/api@sha256:<실제 64자리 digest>",
    "frontend": "registry.example.org/institution/frontend@sha256:<실제 64자리 digest>"
  }
}
```

기관 승인 원장의 `execution-artifacts` evidence는 이 descriptor의 정확한 경로·원본 바이트 SHA-256을 가리켜야 한다. 같은 태그의 내용 변경을 허용하지 않도록 이미지 태그 대신 digest를 사용한다. descriptor 변경·기술 검사 실패·검사 중 근거 변경·기관 승인 만료는 최종 실행을 차단한다.

승인된 실제 배포를 시작할 때만 같은 명령에 `--execute`를 추가한다. 온라인은 검토된 두 image ref를 `scripts/deploy.sh`에 전달한다. 이관은 아래 ADR-0008 load 진입점으로 연결한다. 명령을 직접 우회할 수 없는 운영 권한·파이프라인 구성은 기관의 책임이며, 이 wrapper의 통과는 외부 인가·로그·접근성의 실측 완료 판정이 아니다.

## 4. 독립 migration-tool 도입

기술 검증은 UI 없는 모듈 경로로 실행한다.

```bash
npm run verify:migration
```

이 명령은 migration-tool의 테스트와 bootJar를 검증한다. 원본 온라인 제품의 프런트 census·UI 검토 날짜를 이관 도구 빌드 조건으로 요구하지 않는다. 전체 온라인 제품 빌드나 운영 데이터 적재를 수행했다는 뜻도 아니다.

프런트와 온라인 모듈이 없는 별도 소스 제품은 생산 저장소에서 생성한다.

```bash
npm run migration:export -- --output build/migration-product/my-institution
```

출력은 `build/migration-product/` 안의 새 디렉터리여야 한다. 생성물의 Gradle settings는 migration-tool 하나만 포함하며 독립 package·hook·workflow와 새 `pending` 원장을 제공한다. 기존 기관 승인이나 온라인 공용 메모리를 복사하지 않는다. 생성 후 해당 디렉터리에서 `npm run verify`, `npm run test:operational-contracts`, `npm run review:status`를 실행한다. Node·JDK·Docker는 필요하지만 프런트 설치와 npm 의존성 설치는 필요하지 않다. 새 저장소의 required check와 hook 활성화는 도입 기관이 연결해야 한다.

기관 이관 원장은 [migration-adoption-review.json](../../config/governance/migration-adoption-review.json)이다. 제품은 `migration-tool`, 프로필은 `null`이며 온라인 원장과 별도로 `pending`에서 시작한다. 환경·소유자·UTC 유효기간·scope digest·근거 파일 계약은 온라인과 같다.

| control | 검토 내용 |
|---|---|
| `source-target-identity` | 실제 source/target 식별·접속 대상·쓰기 권한·허용 범위 |
| `mapping-schema-driver` | mapping, target schema, driver 및 이관 실행 계약의 정합 |
| `recovery-cutover` | 실패·재개·중복 방지, 백업·복구·cutover와 운영 책임 |
| `execution-artifacts` | 실행할 JAR·mapping·inventory·plan의 경로·SHA-256, mode·adapter·schema·source freeze 확인이 담긴 descriptor |

```bash
npm run review:adoption:migration -- --environment institution-migration
```

이 기관 검토 원장은 [ADR-0008](../02-architecture/decisions/ADR-0008-multi-source-approved-migration-workflow.md)의 discover → plan → validate → load 승인 artifact와 대상 identity 검사를 대체하지 않는다. 원장 검증을 통과해도 실제 쓰기는 이관 도구 자체의 안전 경계와 운영 승인 절차를 거친다. 승인 원장만으로 실제 복구·cutover 검증이 완료되었다고 주장하지 않는다.

이관 실행 descriptor는 `product: migration-tool`, `profile: null`, 실제 `environmentId`와 `migration`을 기록한다. `migration.jar`·`mapping`·`inventory`·`plan`은 각각 `{path, sha256}`이며 저장소 내부의 실재 파일을 가리킨다. 나머지는 `mode: dry-run` 또는 `commit`, `sourceAdapter: postgresql-pg-catalog`, source `schemas` 배열, 실제 동결을 확인한 `ackSourceFreeze: true`다. wrapper는 현재 built-in PostgreSQL adapter만 지원한다. 기존 CLI의 다른 조사 경로를 지원 완료로 승격하지 않는다.

[migration-execution.example.json](../../config/governance/migration-execution.example.json)을 복사해 실제 대상과
파일 SHA-256을 작성한다. 독립 이관 소스 제품에도 같은 예시를 제공하며 기본 빈 값으로는 실행되지 않는다.

`adoption:check`에 이 descriptor와 환경 ID를 넘겨 검사한 뒤, 승인된 실행에만 `--execute`를 추가한다. 검증 후 JAR가 다시 만들어져 hash가 달라지면 실행 전에 재검토해야 한다. 이 경계는 기술 검사 때문에 달라진 산출물을 자동 승인하지 않는다. 접속 비밀은 descriptor·근거·명령행에 기록하지 않고 기존 환경 변수 계약으로 전달한다.

## 5. 재사용 산출물의 검토 이력

[소스 생성기](../../scripts/generate-reusable-base-source.mjs)는 투영 후 [거버넌스 투영](../../scripts/reusable-governance-projection.mjs)을 적용한다.

1. 원본 URL census·승인·route·UI quality·화면 용어·KRDS 원장, 프로필 소유권·적용범위 계약과 공용 메모리를 `config/governance/upstream-review/`의 snapshot과 SHA-256으로 보존한다.
2. 선택한 프로필의 실제 소스에서 active URL·route census를 재생성한다.
3. 남은 동일 소스·관측에만 승인 record selector를 제한하고 원본 검토자·날짜·근거는 그대로 둔다. 변경되거나 새로 생긴 검색 범위를 이름만으로 승계하지 않는다.
4. UI 시나리오·pilot·KRDS 적용범위를 명시 소유 pack으로 계산한다. 적용 대상 파일이 사라졌으면 실패하고, 비대상 범위에는 제외 사유를 남긴다. 브랜드 프로필 세 종류는 별도 축으로 보존한다. 실행·접근성 근거를 자동 생성하지 않는다.
5. 온라인·독립 이관 환경 검토 모두 새 `pending` 원장으로 생성한다. 공용 메모리도 현재 프로필과 기관 승인 정본을 연결하는 짧은 인덱스로 작성하고, 원본 운영 사실은 upstream 이력으로만 보존한다.
6. 투영 manifest에 남은·승계한·미검토 범위와 snapshot·소스 결속을 기록하고 프로필 lock과 연결한다.

snapshot은 과거 근거다. active 원장이나 기관 승인을 대신하지 않으며, 과거 근거를 오늘 승인한 것처럼 날짜를 다시 쓰지 않는다. 기관의 실제 메뉴 노출·권한·접근성은 별도로 검토한다.

[무결성 검사](../../scripts/reusable-governance-integrity.mjs)는 실제 소스·snapshot·승계 selector·원장 모집단·메모리·lock을 독립 대조한다. 활성 UI 계약은 검증된 적용범위에서 실행한다. 생산 저장소의 `npm run base:verify -- --profile core`와 CI의 세 프로필 matrix는 실제 DB·소스를 생성하여 이 계약과 Java 하네스·스키마·프런트 타입·lint·build까지 검사한다.

온라인 생성물의 CI는 자기 프로필에서 `node scripts/verify-reusable-artifact.mjs`를 직접 실행하는 `artifact-verification` job 하나다. 같은 job에서 기존 버전의 gitleaks working-tree·incremental 검사를 유지한다. 다른 프로필을 다시 생성하거나 원본 3프로필 matrix를 실행하지 않는다.

생산 저장소의 12개 workflow, required-check 명세, package와 pre-push는 `config/governance/upstream-verification/`에 SHA-256이 붙은 비활성 이력으로 보존된다. 원본 CodeQL·E2E·mutation·배포·예약 작업은 기관 범위에 맞춰 별도로 결속해야 한다. 생성물 기본 CI를 원본 6개 required context와 동등한 검증이나 기관 운영 인증으로 해석하지 않는다.

생성물의 `.github/required-checks.json`은 `artifact-verification` 한 context를 제안하는 기관용 템플릿이다. `remoteApplied: false`, `branch: null`, `integrationId: null`이며 실제 원격 ruleset은 설정하지 않는다. 기관은 대상 브랜치·GitHub App·검토 정책을 정하고 실제 workflow와 ruleset을 연결해야 한다. 생성물의 명령 별칭과 정확한 검사 범위는 [재사용 가이드 §4](reusable-base-guide.md#4-산출물-검증)를 따른다. 실제 기관 브라우저 시나리오 실행은 기본 기술 검사에 포함되지 않는다.

## 6. 코드·정책이 바뀔 때

소스 census가 바뀌면 승인 원장의 전체 census 해시를 다시 검토해야 한다. 후보 생성 과정은 기존 정확한 검색 record를 판정할 수 있도록 열려 있지만, 승인 원장과 census의 정합은 별도 계약이 계속 차단한다. 해시 갱신 전에 영향 범위와 기존 판단이 여전히 유효한지 확인한다.

기관 승인은 현재 소스·정책 범위 digest와 evidence 파일 내용에 결속된다. 범위나 근거가 바뀌면 해당 기관 승인을 재검토한다. 운영 환경이 코드 없이 바뀌는 경우에도 담당자가 근거와 승인 기록을 재검토해야 한다. 코드 해시만으로 외부 환경 변경을 발견할 수는 없다.

생성물 무결성은 변경되지 않은 출시 산출물의 검증 경계다. 도입 기관이 개발을 계속할 수 없다는 뜻은 아니며, 변경 이후에는 기존 승계 증거를 현재 소스의 승인으로 재사용할 수 없다는 뜻이다. 변경의 실제 검토와 재생성 없이 metadata·lock의 hash만 갱신해 인증을 복원하지 않는다. 기관 승인 원장 자체는 이후 실제 검토로 갱신할 수 있으며 생성 시 `pending`이었다는 사실과 현재 원장 상태를 구분한다.

온라인 범위에는 애플리케이션 소스·설정뿐 아니라 저장소의 Dockerfile·운영 compose·배포 스크립트도 포함한다. 소스 텍스트의 CRLF는 LF로 정규화해 Windows와 Linux 체크아웃의 줄바꿈 차이로 재승인을 요구하지 않는다. 바이너리와 제출한 근거 파일의 SHA-256은 원본 바이트 기준이다. 기관이 저장소 밖에서 사용하는 추가 배포 설정·운영 변경은 별도 근거에 기록하고 검토해야 한다.

### 6.1 F의 제한된 URL 계약 pilot

첫 적용 범위는 `/search`의 `q`다. [search-url-state.ts](../../frontend/src/lib/navigation/search-url-state.ts)가
route·key·최대 길이·중복·알 수 없는 key 처리를 선언하고 서버 검색 입력·검색 폼·명령 센터가 이를 소비한다.
중복 `q`, 잘못된 타입·Unicode, 길이 초과는 거부하며 임의로 잘라서 다른 검색어로 바꾸지 않는다.
Next가 해석한 값을 다시 decode하거나 trim하지 않고, serializer는 선언된 `q` 값만 인코딩한다.
알 수 없는 query는 검색 상태에 포함하지 않으며, 이미 주소에 있는 문자열을 지우거나 로그 노출을 복구하는 기능은 아니다.

이 pilot은 기존 `/search?q=` 북마크와 네이티브 GET 검색 경로를 유지한다. ADR-0009의 사람 이름 검색 허용과
브라우저·프록시·로그 노출의 accepted-risk는 그대로다. parser 연결과 부정 입력 검증은 기술 계약이며 새로운
데이터 분류·기관 승인이 아니다. 다른 화면으로의 확대는 화면별 목적·key·값·소유권을 검토하고 소비자와
직접 query 조작 우회 검사를 함께 연결한 뒤 진행한다. 전체 URL census와 승인 근거 검사는 계속 유지한다.
