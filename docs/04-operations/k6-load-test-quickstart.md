# k6 빠른 시작

상세 안전 경계·threshold·원격 실행은 [부하 테스트 운영 가이드](load-test-guide.md)가 정본이다.
이 문서는 로컬 `users-100` 확인 경로만 요약한다.

## 1. 준비

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-k6.ps1
k6 version
docker compose up -d --wait db api
Invoke-WebRequest http://localhost:8080/actuator/health
```

통합 시나리오는 게시글을 생성하므로 disposable 개발·성능 DB에서만 실행한다.

## 2. 실행

`BASE_URL`, `TEST_USERNAME`, `TEST_PASSWORD`는 현재 셸에 secure channel로 미리 주입한다. 값을 문서나
스크립트에 저장하지 않는다.

```powershell
k6 run `
  --out json=test-results/k6/results.json `
  -e "BASE_URL=$env:BASE_URL" `
  -e "TEST_USERNAME=$env:TEST_USERNAME" `
  -e "TEST_PASSWORD=$env:TEST_PASSWORD" `
  -e K6_SCENARIO=users-100 `
  test/load-tests/scenarios/load-levels.js
```

`--scenario` 옵션을 사용하지 않는다. 현재 선택 계약은 `-e K6_SCENARIO=users-100|users-500|users-1000`이다.

## 3. 확인

- 명령 exit code와 threshold 실패 여부
- `test-results/k6/results.json`
- `test/load-tests/results/report-*.html`
- 같은 시간대 backend·DB 로그와 테스트 데이터 정리

연결 실패면 compose 상태와 로그부터 확인한다.

```powershell
docker compose ps -a
docker compose logs --tail 150 db api
```

500/1000 VU 또는 GitHub Actions 실행 전에는 [부하 테스트 운영 가이드](load-test-guide.md)를 읽는다.
