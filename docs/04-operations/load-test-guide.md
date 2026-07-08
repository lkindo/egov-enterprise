# k6 Load Test Guide

이 가이드는 k6 를 사용한 부하 테스트 실행 방법과 HTML 리포트 생성 방법을 설명합니다.

## 목차

- [개요](#개요)
- [설치](#설치)
- [테스트 시나리오](#테스트-시나리오)
- [실행 방법](#실행-방법)
- [HTML 리포트 생성](#html-리포트-생성)
- [CI/CD 통합](#cicd-통합)
- [성능 기준치 (SLO)](#성능-기준치-slo)

---

## 개요

이 프로젝트는 [k6](https://k6.io/) 를 사용하여 API 엔드포인트에 대한 부하 테스트를 수행합니다.

### 테스트 대상 엔드포인트

- **로그인**: `POST /api/v1/login`
- **대시보드 조회**: `GET /api/v1/dashboard`
- **게시글 등록**: `POST /api/v1/boards/posts`
- **사용자 목록 조회**: `GET /api/v1/admin/system/users`

### 부하 레벨

- **100 명**: 기본 부하 테스트
- **500 명**: 중간 부하 테스트
- **1000 명**: 고부하 테스트

---

## 설치

### Windows (PowerShell)

```powershell
# Scoop 을 사용한 설치
scoop install k6

# 또는 수동 설치
# 1. https://github.com/grafana/k6/releases 에서 최신 버전 다운로드
# 2. 압축 해제 후 PATH 에 추가
```

### macOS

```bash
brew install k6
```

### Linux

```bash
# Debian/Ubuntu
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C68804
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Fedora/CentOS
sudo yum install https://dl.k6.io/rpm/repo.rpm
sudo yum install k6
```

### 설치 확인

```bash
k6 version
```

---

## 테스트 시나리오

### 디렉토리 구조

```
test/load-tests/
├── config.js                 # 공통 설정
├── utils.js                  # 유틸리티 함수 (HTTP 클라이언트, 인증)
├── utils/
│   └── report.js            # HTML 리포트 생성 모듈
├── scenarios/
│   ├── login-test.js        # 로그인 API 테스트
│   ├── dashboard-test.js    # 대시보드 조회 테스트
│   ├── post-create-test.js  # 게시글 등록 테스트
│   ├── users-list-test.js   # 사용자 목록 조회 테스트
│   └── load-levels.js       # 부하 레벨별 통합 시나리오
├── scripts/
│   └── basic-test.js        # 기본 테스트 (연결 확인용)
└── results/                  # 테스트 결과 (HTML 리포트)
```

---

## 실행 방법

### 기본 테스트 (연결 확인)

```bash
# 기본 테스트 실행 (5 VU, 10 초)
k6 run test/load-tests/scripts/basic-test.js
```

### 단일 시나리오 테스트

```bash
# 로그인 API 테스트
k6 run test/load-tests/scenarios/login-test.js

# 대시보드 조회 테스트
k6 run test/load-tests/scenarios/dashboard-test.js

# 게시글 등록 테스트
k6 run test/load-tests/scenarios/post-create-test.js

# 사용자 목록 조회 테스트
k6 run test/load-tests/scenarios/users-list-test.js
```

### 부하 레벨별 테스트

```bash
# 100 명 동시 사용자 테스트
k6 run --scenario users-100 test/load-tests/scenarios/load-levels.js

# 500 명 동시 사용자 테스트
k6 run --scenario users-500 test/load-tests/scenarios/load-levels.js

# 1000 명 동시 사용자 테스트
k6 run --scenario users-1000 test/load-tests/scenarios/load-levels.js
```

### 환경 변수 설정

```bash
# 기본 URL 변경 (기본값: http://localhost:8080)
export BASE_URL=http://your-server.com

# 테스트 계정 설정 (기본값: admin / admin123!)
export TEST_USERNAME=admin
export TEST_PASSWORD=yourpassword

# 환경 변수와 함께 실행
BASE_URL=http://prod-server.com TEST_USERNAME=admin TEST_PASSWORD=secret k6 run --scenario users-100 test/load-tests/scenarios/load-levels.js
```

---

## HTML 리포트 생성

k6 테스트 실행 시 **자동으로 HTML 리포트가 생성**됩니다. 별도의 설정이 필요하지 않습니다.

### 자동 생성 리포트

테스트 실행 시 `handleSummary` 함수가 자동으로 호출되어 HTML 리포트를 생성합니다:

```bash
k6 run --scenario users-100 test/load-tests/scenarios/load-levels.js
```

**생성 위치:**
```
test/load-tests/results/report-100-2026-04-01T12-00-00.html
```

**파일명 규칙:**
- `report-{loadLevel}-{timestamp}.html`
- 예: `report-100-2026-04-01T12-00-00.html` (100 명 테스트)
- 예: `report-500-2026-04-01T12-30-00.html` (500 명 테스트)

### 리포트 내용

HTML 리포트에는 다음 정보가 포함됩니다:

- **테스트 개요**: 제목, 실행 시간, 부하 레벨
- **체크리스트 요약**: 각 체크 항목의 통과/실패 여부
- **메트릭 요약**:
  - HTTP 요청 응답 시간 (avg, min, med, max, p90, p95, p99)
  - 요청 수량 (total, failed)
  - 처리량 (requests/s)
  - 데이터 전송량 (data sent/received)
- **스레드별 통계**: VU 수, 반복 횟수
- **임계값 결과**: SLO 달성 여부

### JSON 결과와 함께 저장

JSON 형식으로 상세 메트릭을 저장하려면:

```bash
k6 run \
  --out json=test-results/k6/results.json \
  --scenario users-100 \
  test/load-tests/scenarios/load-levels.js
```

이 경우:
- `test-results/k6/results.json`: 상세 메트릭 (JSON)
- `test/load-tests/results/report-100-{timestamp}.html`: HTML 리포트

### 커스텀 리포트 생성

공통 리포트 모듈을 사용하여 커스텀 리포트를 생성할 수 있습니다:

```javascript
import { createHtmlReport, textSummary } from '../utils/report.js';

export function handleSummary(data) {
  return {
    'my-report.html': createHtmlReport(data, {
      title: 'My Custom Load Test',
      theme: 'light',  // 'dark', 'light', 'default'
      showChart: true,
    }),
    stdout: textSummary(data, { enableColors: true }),
  };
}
```

### 리포트 보기

생성된 HTML 파일을 브라우저에서 엽니다:

```bash
# Windows (PowerShell)
Start-Process test/load-tests/results/report-100-*.html

# macOS
open test/load-tests/results/report-100-*.html

# Linux
xdg-open test/load-tests/results/report-100-*.html
```

---

## CI/CD 통합

### GitHub Actions

GitHub Actions 는 푸시 또는 PR 시 자동으로 부하 테스트를 실행합니다.

**워크플로우 파일:** `.github/workflows/load-test.yml`

**자동 실행 조건:**
- `main` 브랜치 푸시
- `develop` 브랜치 푸시
- `main` 브랜치 대상 PR

**수동 실행:**
- Actions 탭 > "Performance Load Test" > "Run workflow"
- 부하 레벨 선택 (100, 500, 1000)

**결과 확인:**
1. Actions 탭에서 실행 클릭
2. "Upload HTML Report" 아티팩트 다운로드
3. HTML 파일 로컬에서 열기

### GitHub Pages 배포 (선택사항)

워크플로우 파일의 주석을 해제하면 GitHub Pages 에 리포트가 자동 배포됩니다.

1. `gh-pages` 브랜치 생성
2. Settings > Pages 에서 gh-pages 브랜치 선택
3. 워크플로우 파일의 "Deploy to GitHub Pages" 단계 주석 해제

---

## 성능 기준치 (SLO)

### 기본 임계값

| 메트릭 | 기준치 | 설명 |
|--------|--------|------|
| HTTP 응답 시간 (p95) | < 500ms | 95% 요청이 500ms 이내 처리 |
| HTTP 실패율 | < 1% | 전체 요청의 1% 미만 실패 |
| 테스트 소요 시간 | < 5 분 | 전체 테스트가 5 분 이내 완료 |

### 부하 레벨별 목표

| 부하 레벨 | 동시 사용자 | 응답 시간 (p95) | 목표 TPS |
|-----------|-------------|-----------------|----------|
| Level 1 | 100 명 | < 500ms | > 100 TPS |
| Level 2 | 500 명 | < 800ms | > 400 TPS |
| Level 3 | 1000 명 | < 1000ms | > 800 TPS |

### 임계값 조정

`test/load-tests/scenarios/load-levels.js` 파일에서 조정:

```javascript
export const options = {
  thresholds: {
    http_req_duration: ['p(95)<1000'],  // 95% 요청이 1000ms 이내
    http_req_failed: ['rate<0.01'],    // 1% 미만 실패
  },
};
```

---

## 문제 해결

### "k6: command not found"

- k6 가 PATH 에 있는지 확인
- 재설치 후 터미널 재시작

### "Connection refused"

- 테스트 대상 서버가 실행 중인지 확인
- BASE_URL 환경 변수 확인

### "Token expired"

- 테스트 계정의 비밀번호 확인
- 토큰 만료 시간이 지났는지 확인 (로그인 로직 재실행)

### HTML 리포트가 생성되지 않음

- `handleSummary` 함수가 스크립트에 있는지 확인
- `test/load-tests/results/` 디렉토리 쓰기 권한 확인

---

## 추가 리소스

- [k6 부하 테스트 빠른 시작 (k6-load-test-quickstart.md)](./k6-load-test-quickstart.md)
- [성능 최적화 가이드 (performance-optimization-guide.md)](./performance-optimization-guide.md)
- [k6 공식 문서](https://k6.io/docs/)
- [k6 GitHub 리포지토리](https://github.com/grafana/k6)
- [k6-reporter](https://github.com/benc-uk/k6-reporter)
- [k6-summary](https://jslib.k6.io/k6-summary/)
