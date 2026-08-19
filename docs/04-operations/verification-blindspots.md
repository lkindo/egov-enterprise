# 검증 사각지대 운영 런북

빌드·워크플로·게이트가 **존재한다는 사실**과 대상 동작을 **검증했다는 사실**을 구분하기 위한 런북이다.
과거 장애의 연대기는 Git과 PR에 맡기고, 여기에는 현재 확인 방법과 판정 조건만 둔다.

## 검증 증거의 단계

| 단계 | 증명하는 것 | 증명하지 못하는 것 |
|---|---|---|
| 선언 존재 | workflow, script, test, healthcheck가 파일에 있다 | 트리거가 유효하거나 최근 실행됐다는 것 |
| 빌드 성공 | 소스 또는 이미지가 생성된다 | 프로세스가 기동하고 실제 요청을 처리한다는 것 |
| 프로세스 기동 | 포트에 프로세스가 떠 있다 | readiness, 인증, 의존 서비스, 주요 사용자 흐름 |
| 실행 성공 | 특정 조건에서 명령이 exit 0이다 | 필요한 대상 전체를 검사했고 결과물이 생겼다는 것 |
| 산출물 검증 | report·trace·XML이 존재하고 예상 범위를 포함한다 | 그 결과가 병합을 차단한다는 것 |
| required CI | 실패 시 병합이 차단된다 | 운영 환경·외부 서비스에서 정상이라는 것 |

완료 보고에는 최소한 `대상 + 실행 경로 + 결과 + 제외한 범위`를 적는다. `not-run`, `skipped`,
`blocked-external`, `advisory`를 `passed`로 표현하지 않는다.

## 현재 비결정적·외부 의존 검증

| 경로 | 저장소 실행 계약 | 성공 판정 | 남는 사각지대 |
|---|---|---|---|
| OWASP Dependency-Check | [dependency-check.yml](../../.github/workflows/dependency-check.yml), 주간·수동 advisory | 애플리케이션 모듈 XML 리포트가 모두 생성되고 판정 대상이 실제 runtime dependency를 포함 | NVD API·네트워크에 의존하며 취약점 결과 자체는 required merge gate가 아니다 |
| k6 | [load-test.yml](../../.github/workflows/load-test.yml), 주간·수동 | 선택한 단일 시나리오가 threshold를 통과하고 JSON·HTML·백엔드 로그가 생성 | 대상 환경·계정이 필요하고 데이터 쓰기 시나리오가 있다. PR required check가 아니다 |
| ZAP | [zap-scan.yml](../../.github/workflows/zap-scan.yml), 주간·수동 | compose health 후 baseline/API scan 산출물이 생성 | 기본 흐름은 미인증 공개 표면 중심이며 로그인 뒤 관리자 화면 전체를 대신하지 않는다 |
| Lighthouse | [lighthouse.yml](../../.github/workflows/lighthouse.yml), 주간·수동 | `/login`을 production build로 측정하고 JSON report가 생성 | performance는 CI 러너 편차 때문에 warn이고, 실제 사용자·지역 RUM을 대신하지 않는다 |
| 외부 자격 회전 | 저장소 밖 provider·서버에서 수행 | 새 자격의 동작, 구 자격의 폐기, dangling credential 부재를 secure channel에서 확인 | 저장소 diff나 secret scan만으로 외부 폐기를 증명할 수 없다 |
| 레거시 암호 데이터 census | 권한 있는 운영 DB read-only 조회 | 레거시 password hash와 이전 ARIA key 암호문의 잔존 건수·전환 결과를 값 노출 없이 집계 | 코드의 호환 adapter와 단위 테스트만으로 실제 데이터 0건을 증명할 수 없다 |
| 운영 백업·복구·DR | 운영 환경의 승인된 복구 훈련 | 백업 산출물로 격리 환경 복구 후 무결성·RTO/RPO 증거를 남김 | repository CI와 로컬 compose는 운영 백업의 존재·복원 가능성을 증명하지 않는다 |

외부 입력이 없어 실행하지 못하면 [.agent/memory/known-gaps.md](../../.agent/memory/known-gaps.md)에
`blocked-external`로 유지한다. 설정 파일이 존재한다는 이유로 상태를 닫지 않는다.

## 워크플로 점검 절차

### 1. 정의와 트리거 확인

```powershell
Get-ChildItem .github/workflows/*.yml
rg -n "^(on:|  schedule:|  workflow_dispatch:|  pull_request:|  push:)" .github/workflows
```

YAML 구문, event filter, job-level `if`, 필요한 secret·permission을 함께 본다. 외부 상태는 현재 GitHub에서
다시 조회한다.

```bash
gh run list --workflow load-test.yml --limit 20 \
  --json databaseId,event,status,conclusion,createdAt,headSha
```

실행 0회, 최근 연속 실패, 장기 미실행은 `verified`가 아니라 `not-run` 또는 `needs-revalidation`이다.

### 2. 실패 진단과 산출물 확인

- compose 기반 잡은 `docker compose ps -a`, 서비스 로그, container `.State`를 남긴다.
- 스캐너는 exit code만 보지 않고 report 파일 수와 검사한 모듈·대상을 확인한다.
- `continue-on-error`는 결과 신호를 삼킬 수 있으므로 step·job·workflow 세 수준의 결론을 각각 확인한다.
- `if: always()`인 업로드나 정리 단계가 본 실행 실패를 가리지 않는지 확인한다.

### 3. 빌드와 런타임 분리

컨테이너 변경은 다음을 별개의 증거로 취급한다.

```bash
docker compose build api frontend
docker compose up -d --wait db api frontend
docker compose ps -a
```

이미지 빌드만 성공했으면 `build-verified`, health와 대표 요청까지 성공했으면 `runtime-verified`라고 기록한다.
기동 실패 시 자동 정리 전에 로그와 상태를 수집한다.

### 4. 강제력 확인

저장소 required check 명세는 [.github/required-checks.json](../../.github/required-checks.json)이 정본이다.

```bash
npm run verify:ops
```

로컬 pre-push와 수동·주간 advisory 잡은 빠른 피드백 또는 관측 계층이지 병합 권위가 아니다.
required CI가 실제 GitHub ruleset과 일치하는지 확인한 뒤에만 “병합을 차단한다”고 표현한다.

## 신규·수정 게이트 체크리스트

1. 무엇을 검출하고 무엇을 의도적으로 제외하는지 적는다.
2. 로컬 또는 CI 실행 경로에 실제로 연결한다.
3. 정상 입력이 green인지 확인한다.
4. 대표 위반을 주입해 red가 되는지 확인하고 즉시 원복한다.
5. 스캔 대상 0건이나 report 0건인 vacuous green을 실패로 만든다.
6. required인지 advisory인지 문서와 workflow 이름에 같은 의미로 표시한다.
7. 외부 상태·일회성 실행 횟수는 본문 상수로 고정하지 않고 조회 명령과 확인일을 결과 기록에 남긴다.

관련 절차: [부하 테스트 가이드](load-test-guide.md), [의존성 취약점 판정](dependabot-alert-census.md),
[암호화 키 로테이션](crypto-key-rotation.md), [AGENTS Evidence guardrails](../../AGENTS.md#evidence-guardrails).
