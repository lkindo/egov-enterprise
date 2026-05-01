# k6 부하 테스트 빠른 시작 가이드

## 1 분 빠른 시작

### 1. k6 설치 (PowerShell 관리자 권한으로 실행)

```powershell
# 스크립트 다운로드 및 실행
irm https://raw.githubusercontent.com/your-repo/main/scripts/install-k6.ps1 | iex
```

**또는 수동 설치:**

```powershell
# 1. k6 다운로드
curl -L https://github.com/grafana/k6/releases/download/v1.7.1/k6-v1.7.1-win-amd64.zip -o $env:TEMP\k6.zip

# 2. 압축 해제
Expand-Archive -Path $env:TEMP\k6.zip -DestinationPath $env:TEMP\k6

# 3. 설치 디렉토리 생성
New-Item -ItemType Directory -Force -Path C:\k6
Copy-Item $env:TEMP\k6\k6-v1.7.1-win-amd64\k6.exe C:\k6\k6.exe

# 4. PATH 추가 (사용자)
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
[Environment]::SetEnvironmentVariable("Path", "${userPath};C:\k6", "User")
```

### 2. 설치 확인

```powershell
# 새 PowerShell 창을 연 후 실행
k6 version
```

### 3. 백엔드 서버 시작

```powershell
# 프로젝트 루트에서
cd d:\project\egov-enterprise

# 테스트 프로파일로 서버 시작
./gradlew :api-server:bootRun --args='--spring.profiles.active=test'
```

서버가 시작될 때까지 기다립니다 (약 1-2 분).

### 4. 부하 테스트 실행

```powershell
# 100 명 부하 테스트 (5 분 소요)
k6 run --scenario users-100 test/load-tests/scenarios/load-levels.js

# 500 명 부하 테스트 (9 분 소요)
k6 run --scenario users-500 test/load-tests/scenarios/load-levels.js

# 1000 명 부하 테스트 (20 분 소요)
k6 run --scenario users-1000 test/load-tests/scenarios/load-levels.js
```

### 5. 결과 확인

테스트가 완료되면:

1. **콘솔 출력**에서 실시간 메트릭 확인
2. **HTML 리포트** 확인:
   ```powershell
   Start-Process test/load-tests/results/report-*.html
   ```

---

## 문제 해결

### "k6: command not found"

1. PATH 에 k6 가 있는지 확인:
   ```powershell
   echo $env:Path | Select-String "k6"
   ```

2. PowerShell 을 재시작하세요.

3. 수동으로 PATH 추가:
   ```powershell
   [Environment]::SetEnvironmentVariable("Path", "${env:Path};C:\k6", "User")
   ```

### "Connection refused"

백엔드 서버가 실행 중인지 확인:

```powershell
# 헬스체크 엔드포인트 확인
curl http://localhost:8080/actuator/health
```

서버가 실행 중이 아니면:

```powershell
./gradlew :api-server:bootRun
```

### "Login failed"

테스트 계정이 없는 경우:

1. `test/load-tests/config.js` 에서 계정 확인
2. 또는 환경 변수로 설정:
   ```powershell
   $env:TEST_USERNAME="youruser"
   $env:TEST_PASSWORD="yourpass"
   k6 run --scenario users-100 test/load-tests/scenarios/load-levels.js
   ```

---

## 고급 옵션

### JSON 결과 저장

```powershell
k6 run \
  --out json=test-results/k6/results.json \
  --scenario users-100 \
  test/load-tests/scenarios/load-levels.js
```

### 커스텀 URL 사용

```powershell
$env:BASE_URL="http://prod-server.com"
k6 run --scenario users-100 test/load-tests/scenarios/load-levels.js
```

### 특정 테스트만 실행

```powershell
# 로그인 테스트만
k6 run test/load-tests/scenarios/login-test.js

# 대시보드 테스트만
k6 run test/load-tests/scenarios/dashboard-test.js
```

---

## 참고 문서

- [load-test-guide.md](./load-test-guide.md) - 상세 가이드
- [performance-optimization-guide.md](./performance-optimization-guide.md) - 성능 최적화 가이드

---

**마지막 업데이트**: 2026-05-01 (Updated via Antigravity)
