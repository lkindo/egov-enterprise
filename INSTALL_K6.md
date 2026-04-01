# k6 설치 및 테스트 실행 가이드

## 현재 상태 (2026-04-01)

⚠️ **GitHub 다운로드 문제로 인해 k6 자동 설치가 작동하지 않습니다.**

아래 수동 설치 방법을 따라 k6 를 설치하세요.

---

## 방법 1: 수동 다운로드 (권장)

### 1 단계: k6 다운로드

브라우저에서 다음 URL 로 이동하여 k6 를 다운로드합니다:

**https://github.com/grafana/k6/releases/tag/v1.7.1**

페이지 하단의 "Assets" 섹션에서 다음 파일을 다운로드합니다:
- `k6-1.7.1-win-amd64.zip` (Windows 64-bit)

### 2 단계: 압축 해제

다운로드한 zip 파일을 압축 해제합니다:

```powershell
# 다운로드 폴더에서
cd C:\Users\lkind\Downloads
Expand-Archive -Path k6-1.7.1-win-amd64.zip -DestinationPath k6
```

### 3 단계: 설치 디렉토리로 복사

```powershell
# C:\k6 디렉토리 생성
New-Item -ItemType Directory -Force -Path C:\k6

# k6.exe 복사
Copy-Item C:\Users\lkind\Downloads\k6\k6.exe C:\k6\k6.exe
```

### 4 단계: PATH 추가

```powershell
# 사용자 PATH 에 추가
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*C:\k6*") {
    [Environment]::SetEnvironmentVariable("Path", "$userPath;C:\k6", "User")
    Write-Host "PATH 에 C:\k6 추가됨" -ForegroundColor Green
}
```

### 5 단계: 확인

**새 PowerShell 창을 연 후** 다음 명령 실행:

```powershell
k6 version
```

성공 시 출력 예시:
```
k6 v1.7.1 (go1.24.1, windows/amd64)
```

---

## 방법 2: Scoop 사용 (간편)

Scoop 이 이미 설치되어 있는 경우:

```powershell
scoop install k6
```

Scoop 이 설치되어 있지 않은 경우:

```powershell
# 1. Scoop 설치
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

# 2. k6 설치
scoop install k6
```

---

## 방법 3: Chocolatey 사용

Chocolatey 가 설치되어 있는 경우:

```powershell
choco install k6 -y
```

Chocolatey 설치:
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

---

## 백엔드 서버 시작

k6 설치 후, 백엔드 서버를 시작합니다:

```powershell
# 프로젝트 루트로 이동
cd d:\project\egov-enterprise

# 테스트 프로파일로 서버 시작
./gradlew :api-server:bootRun --args='--spring.profiles.active=test'
```

서버 시작까지 약 1-2 분 소요됩니다.

### 서버 상태 확인

새 터미널에서 다음 명령으로 서버가 정상적으로 실행되었는지 확인:

```powershell
# 헬스체크
curl http://localhost:8080/actuator/health

# 또는 브라우저에서
Start-Process http://localhost:8080/actuator/health
```

응답 예시:
```json
{"status":"UP"}
```

---

## 부하 테스트 실행

서버가 실행 중이면 부하 테스트를 시작합니다:

### 1. 100 명 부하 테스트 (5 분 소요)

```powershell
cd d:\project\egov-enterprise
k6 run --scenario users-100 test/load-tests/scenarios/load-levels.js
```

### 2. 500 명 부하 테스트 (9 분 소요)

```powershell
k6 run --scenario users-500 test/load-tests/scenarios/load-levels.js
```

### 3. 1000 명 부하 테스트 (20 분 소요)

```powershell
k6 run --scenario users-1000 test/load-tests/scenarios/load-levels.js
```

---

## 결과 확인

### 콘솔 출력

테스트가 실행되는 동안 콘솔에서 실시간 메트릭을 확인할 수 있습니다:

```
     ✓ login status is 200
     
     checks.........................: 100.00% ✓ 12345      ✗ 0
     data_received..................: 2.5 MB  8.3 kB/s
     data_sent......................: 1.2 MB  4.0 kB/s
     http_req_duration..............: avg=150ms min=50ms med=140ms max=500ms p(90)=200ms p(95)=250ms p(99)=400ms
     http_reqs......................: 12345   41.23/s
```

### HTML 리포트

테스트 완료 후 HTML 리포트가 자동 생성됩니다:

```powershell
# 최신 리포트 열기
Get-ChildItem test\load-tests\results\report-*.html | Sort-Object LastWriteTime -Descending | Select-Object -First 1 | Invoke-Item
```

또는 직접 탐색:
```powershell
explorer test\load-tests\results
```

---

## 문제 해결

### k6 명령어를 찾을 수 없음

1. **PATH 확인**:
   ```powershell
   echo $env:Path | Select-String "k6"
   ```

2. **PowerShell 재시작**: 새 터미널에서 PATH 가 업데이트됩니다.

3. **수동 PATH 추가**:
   ```powershell
   [Environment]::SetEnvironmentVariable("Path", "${env:Path};C:\k6", "User")
   ```

### 서버 연결 오류

1. **서버 실행 확인**:
   ```powershell
   netstat -ano | findstr :8080
   ```

2. **서버 재시작**:
   ```powershell
   # Ctrl+C 로 서버 중지
   ./gradlew --stop
   ./gradlew :api-server:bootRun
   ```

### 로그인 실패

테스트 계정이 없는 경우 `test/load-tests/config.js` 파일을 확인하거나 환경 변수로 설정:

```powershell
$env:TEST_USERNAME="testuser"
$env:TEST_PASSWORD="testpass123!"
k6 run --scenario users-100 test/load-tests/scenarios/load-levels.js
```

---

## 참고 문서

- [LOAD_TEST_GUIDE.md](./docs/LOAD_TEST_GUIDE.md) - 상세 가이드
- [QUICKSTART.md](./QUICKSTART.md) - 빠른 시작
- [records/](./records/) - 테스트 결과 기록

---

**최종 업데이트**: 2026-04-01  
**k6 버전**: v1.7.1  
**상태**: 📋 설치 대기 중 (수동 설치 필요)
