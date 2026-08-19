# k6 부하 테스트 운영 가이드

현재 신뢰할 수 있는 통합 부하 시나리오는
[`test/load-tests/scenarios/load-levels.js`](../../test/load-tests/scenarios/load-levels.js)이고,
원격 실행 계약은 [`.github/workflows/load-test.yml`](../../.github/workflows/load-test.yml)이다.
부하 테스트는 PR 병합 게이트가 아니라 실제 환경에서 성능을 관측하는 주간·수동 경로다.

## 안전 경계

- 통합 시나리오는 로그인·조회뿐 아니라 **게시글 생성 요청**도 보낸다. 운영 DB를 기본 대상으로 삼지 않는다.
- disposable 또는 승인된 성능 환경과 전용 계정을 사용한다. 대상·계정·운영 창구가 없으면 상태는
  `blocked-external`이다.
- `BASE_URL`, 사용자명, 비밀번호, 토큰을 문서·명령 이력·리포트에 커밋하지 않는다.
- 테스트 전후 데이터량, DB 부하, 오류율, 대상 SHA와 환경 설정을 기록한다. 서로 다른 환경의 수치를 직접 비교하지 않는다.
- 500/1000 VU는 서버뿐 아니라 DB·네트워크·외부 연동에도 영향을 준다. 낮은 단계가 안정적인 것을 확인한 뒤 올린다.

## 현재 시나리오 계약

| 이름 | ramp-up / 유지 / ramp-down | 최대 VU |
|---|---|---:|
| `users-100` | 1분 / 3분 / 1분 | 100 |
| `users-500` | 2분 / 5분 / 2분 | 500 |
| `users-1000` | 5분 / 10분 / 5분 | 1000 |

통합 threshold는 `http_req_duration: p(95)<1000ms`, `http_req_failed: rate<1%`다. 개별 요청 check도
스크립트에 있으며 로그인 500ms, 대시보드 800ms, 사용자 목록 600ms, 게시글 생성 1000ms 기준을 사용한다.
수치를 바꾸면 스크립트와 이 표를 같은 변경에서 갱신하고, 왜 바꾸는지 기준선 자료를 남긴다.

## 로컬 실행

### 1. 도구와 대상 준비

Windows 설치 스크립트:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-k6.ps1
k6 version
```

개발용 compose를 쓸 때:

```powershell
docker compose up -d --wait db api
Invoke-WebRequest http://localhost:8080/actuator/health
```

실제 부하 기준선을 얻으려면 production과 유사한 승인 환경을 사용한다. 로컬 compose 결과를 운영 용량으로
일반화하지 않는다.

대상이 응답하지 않으면 k6를 재실행하기 전에 compose 상태와 API·DB 로그를 확인한다.

```powershell
docker compose ps -a
docker compose logs --tail 150 db api
```

### 2. 단일 부하 단계 실행

`BASE_URL`, `TEST_USERNAME`, `TEST_PASSWORD`는 실행 전에 현재 셸에 secure channel로 주입한다. 실제 값을
문서, 스크립트, 셸 기록에 저장하지 않는다.

```powershell
k6 run `
  --out json=test-results/k6/results.json `
  -e "BASE_URL=$env:BASE_URL" `
  -e "TEST_USERNAME=$env:TEST_USERNAME" `
  -e "TEST_PASSWORD=$env:TEST_PASSWORD" `
  -e K6_SCENARIO=users-100 `
  test/load-tests/scenarios/load-levels.js
```

`k6 run --scenario ...`은 유효한 CLI 옵션이 아니다. `K6_SCENARIO`를 빠뜨리면 현재 스크립트는 세 단계
전체를 동시에 구성하므로 항상 명시한다. 허용되지 않은 이름은 스크립트가 즉시 실패한다.

### 3. 종료와 증적

- exit code와 threshold 결과
- `test-results/k6/results.json`
- `test/load-tests/results/report-*.html`
- 같은 시간대의 API/JVM·DB 로그와 자원 메트릭
- 생성 데이터의 정리 결과

HTML 하나만으로 성공을 선언하지 않는다. report가 실제 실행 조건과 같은 `K6_SCENARIO`, target SHA,
환경을 가리키는지 함께 확인한다.

## GitHub Actions 실행

`Performance Load Test` workflow는 주간 schedule 또는 `workflow_dispatch`로 실행한다. 수동 실행에서
100/500/1000 중 하나를 선택하며, workflow는 compose로 `db`와 `api`를 health 상태까지 기동한 뒤 k6를 실행한다.

필요한 저장소 secret:

- `LOAD_TEST_BASE_URL`
- `LOAD_TEST_USERNAME`
- `LOAD_TEST_PASSWORD`
- 선택: `K6_CLOUD_TOKEN`

secret 미설정 fallback은 개발 compose용일 뿐 운영 성능 계정 정책이 아니다. workflow 완료 뒤 다음 artifact를 확인한다.

- `k6-results-<run-id>`: JSON과 backend log
- `k6-html-report-<run-id>`: HTML report
- virtual-thread pinning 경고와 compose 실패 진단

스케줄 잡이므로 초록이라고 PR 품질을 보증하지 않고, 오래 실행되지 않았거나 artifact가 없으면
[검증 사각지대 런북](verification-blindspots.md)에 따라 `not-run`/`unverified`로 판정한다.

## 해석 순서

1. check 실패와 HTTP 실패율을 먼저 본다. 4xx/5xx가 섞인 응답시간 평균은 성능 기준선이 아니다.
2. p50/p95/p99와 처리량을 함께 보고 tail latency 악화를 분리한다.
3. 같은 구간의 Hikari active/pending, JVM pause·heap, DB lock·slow query, CPU를 대조한다.
4. 단일 병목 가설만 바꾸고 같은 환경·시나리오로 재실행한다.
5. 개선 효과가 noise보다 큰지 여러 회차로 확인하고, 부작용이 있으면 원복한다.

## 현재 한계

- `login-test.js`, `post-create-test.js` 등 개별 legacy 시나리오는 통합 시나리오와 API 필드·경로가 다를 수 있다.
  현재 계약을 다시 검증하기 전에는 공식 증적으로 사용하지 않는다.
- 통합 시나리오는 고정된 혼합 비율과 테스트 게시판 ID를 사용한다. 다른 workload를 대표한다고 가정하지 않는다.
- k6는 브라우저 렌더링 성능을 재지 않는다. 프론트 런타임은 [Lighthouse workflow](../../.github/workflows/lighthouse.yml)를 본다.

관련: [성능 최적화 가이드](performance-optimization-guide.md),
[DB 최적화 가이드](database-optimization-guide.md).
