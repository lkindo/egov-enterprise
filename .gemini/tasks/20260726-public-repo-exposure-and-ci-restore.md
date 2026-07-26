# 퍼블릭 전환 대응 — CI 복구 및 노출 시크릿 조치

- **일자**: 2026-07-26
- **등급**: L2 (CI 파이프라인 + 보안 사고 대응)
- **계기**: 저장소를 **퍼블릭으로 전환**(GitHub 실측: `visibility=public`). 과금차단이 풀려 CI 가 되살아남과
  동시에, 히스토리에 남아 있던 시크릿이 **공개 열람 가능** 상태가 됐다.

---

## 1. 🚨 P0 — RSA 개인키가 공개 히스토리에 존재

| 항목 | 실측 |
|---|---|
| 파일 | `ssh-key-2026-01-18.key` (27줄, `-----BEGIN RSA PRIVATE KEY-----`) |
| 추가 커밋 | `11366ca48` |
| 추적 해제 커밋 | `9217bc27c` (2026-07-16) — **파일 삭제일 뿐 히스토리는 그대로** |
| 도달 가능 브랜치 | `main`, `dev`, `template/reusable-base` |
| 저장소 내 사용처 | 0건 (배포 스크립트·워크플로우 참조 없음 → 외부 서버 접속용으로 추정) |

**현재 상태**: 퍼블릭 저장소이므로 `github.com/lkindo/egov-enterprise/blob/11366ca48/ssh-key-2026-01-18.key`
로 **누구나 내려받을 수 있다.** 추적 해제(9217bc27c)는 이 노출을 막지 못한다.

### 조치 순서 (순서가 중요하다)

1. **키 폐기·교체 먼저** — 히스토리 정리보다 우선한다. 노출 시점이 최소 2026-07-16 이전이고
   퍼블릭 전환 이후에는 크롤러가 수집했다고 가정해야 한다.
   - 해당 공개키를 `~/.ssh/authorized_keys` 에서 제거한 서버 전수 확인
   - 신규 키페어 발급 후 재배포
   - 접속 로그에서 미인지 세션 확인
2. **히스토리 purge** (선택 — 1번을 대체하지 못한다):
   ```sh
   # git-filter-repo 권장 (BFG 도 가능)
   git filter-repo --invert-paths --path ssh-key-2026-01-18.key --force
   git push --force --all && git push --force --tags
   ```
   ⚠ 히스토리 재작성은 **되돌리기 어렵고** 모든 클론(이중 오퍼레이터 워킹트리 포함)을 깨뜨린다.
   커밋 SHA 가 전부 바뀌므로 진행 전 사용자 승인 필수.
3. **GitHub 캐시 무효화** — force push 후에도 GitHub 은 dangling 커밋을 일정 기간 제공한다.
   Support 에 캐시 purge 요청 필요.
4. **재발 방지(이미 있음)**: `.githooks/pre-commit` 의 gitleaks 스캔 — 단 **gitleaks 설치 시에만**
   동작한다(미설치 환경 무해 통과). 퍼블릭 전환을 계기로 설치를 권장하며, GitHub 의
   Secret scanning + Push protection(퍼블릭 저장소 무료)도 함께 켜는 것이 좋다.

---

## 2. CI 복구 — 실패 원인은 코드가 아니었다

퍼블릭 전환 전 최근 실행은 **잡 시작 2초 만에 실패**(backend-build 2s, e2e-merge-reports 3s)했다.
컴파일조차 시작하지 못한 시간이며, 전형적인 과금차단 패턴이다. 즉 **CI 설정 결함이 아니라 계정 상태**가
원인이었고, 그동안 방치된 구성 결함이 그대로 남아 있었다.

> CI 로그는 미인증 API 로 step 단위 조회가 불가해(steps 배열 비공개), 백엔드 잡과 **동일 명령을 로컬에서
> 재현**해 검증했다: `./gradlew build jacocoRootReport check -Dopenapi.export.path=api-docs.json`

### 2.1 死스텝 제거
`Export OpenAPI Spec` (`./gradlew :api-server:bootRun & sleep 30 && curl ... || true`) 삭제.
① `build` 의 `-Dopenapi.export.path` 오프라인 내보내기와 완전 중복 ② `|| true` + `continue-on-error` 라
어떤 실패도 보고하지 않음 ③ 산출물 `openapi-generated.json` 참조처 **0건** ④ 백그라운드 서버가 러너에
남아 후속 잡을 방해할 수 있음.

### 2.2 게이트 vs 비게이트 정직화 (§0.7-H5)
| 스텝 | 종전 | 조치 |
|---|---|---|
| OWASP Dependency-Check | `continue-on-error` — 이름만 "Security Scan" | 이름에 **(advisory, non-blocking)** 명시 + 승격 조건(`NVD_API_KEY`) 병기 |
| pnpm audit | `high` + `continue-on-error` (전부 비차단) | **critical = 차단 게이트**로 승격, `high` 는 advisory 로 분리 |
| 아티팩트 업로드 3종 | `continue-on-error` | "게이트 아님" 주석 부기(업로드 실패로 빌드를 깨지 않는 것은 정당) |

`high` 를 차단하지 않는 이유: 신규 권고가 등재되기만 해도 **코드 변경 없이** CI 가 붉어져 시간폭탄이 된다.

### 2.3 신호 오염 차단
- `e2e-merge-reports` 가 `if: always()` 라 **e2e-tests 가 스킵돼도 실행**돼 병합할 리포트가 없어 반드시
  실패했다 → 상류 실패 1건이 red 2건으로 보였다. 실제 실행된 경우에만 병합하도록 조건 강화.
- `load-test.yml` 이 main/develop 의 **모든 push·PR** 마다 실행되며 대상 URL 부재로 전량 실패했다 →
  주간 스케줄 + 수동 실행으로 축소(성능 관측은 커밋 단위 게이트가 아니다).
- 잡별 `timeout-minutes` 부여(backend 45 / frontend 25 / merge 15 / mutation 60). 종전 기본 6시간이라
  행(hang) 시 러너를 장시간 점유했다.
- `ci.yml` 에 `workflow_dispatch` 추가 — 상태 확인에 더미 커밋이 필요 없도록.

### 2.4 빌드 스크립트 회귀 교정 (자체 발견)
`jacocoRootReport` 가 `subprojects.collect { it.tasks.withType(Test) }` 로 **모든 Test 태스크를 자동
수집**한다. 전날 신설한 `schemaValidationTest`(Docker 필수)가 여기에 딸려 들어가 `make coverage` 가
Docker 없는 환경에서 실패하는 회귀가 생겼다 → 해당 태스크만 제외(커버리지 기여도 없음).

Testcontainers Docker 워크어라운드(`DOCKER_HOST`/API 버전 강제)도 **Windows 한정**으로 축소했다.
리눅스 러너는 기본 탐색이 정상이라, 값을 강제하면 러너의 엔진 버전에 불필요하게 결합된다.

---

## 3. 남은 것

1. **키 교체**(위 §1) — 사용자 조치, 최우선.
2. **첫 그린 CI 도달** — E2E 잡은 과금차단 기간 동안 한 번도 실행되지 않았다. 알려진 플레이키 tier 가
   있어([e2e-test-guide.md](../../docs/03-guides/e2e-test-guide.md)) 몇 차례 반복 교정이 필요할 수 있다.
3. **브랜치 보호 + CODEOWNERS 실효화** — 퍼블릭 저장소는 외부 PR 이 들어올 수 있어 우선순위가 올라갔다.
