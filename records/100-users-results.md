# 100 명 부하 테스트 결과

## 테스트 개요

- **테스트 일시**: 2026-04-01 (미실행 - k6 설치 필요)
- **부하 레벨**: 100 명 동시 사용자
- **시나리오**: users-100 (ramping-vus)
- **테스트 기간**: 5 분 (1 분 ramp-up, 3 분 steady, 1 분 ramp-down)

## 테스트 환경

### 서버 환경
- **URL**: http://localhost:8080
- **프로파일**: test
- **DB**: PostgreSQL 14 (localhost:5432)

### 클라이언트 환경
- **Tool**: k6 v1.7.1
- **OS**: Windows 11
- **CPU**: (미기재)
- **Memory**: (미기재)

## 실행 명령

```powershell
k6 run --scenario users-100 test/load-tests/scenarios/load-levels.js
```

## 결과 요약

### 임계값 (Thresholds)

| 메트릭 | 기준치 | 결과 | 통과 여부 |
|--------|--------|------|-----------|
| http_req_duration | p(95) < 1000ms | - | - |
| http_req_failed | rate < 0.01 | - | - |

### 성능 메트릭

| 항목 | 값 |
|------|-----|
| 평균 응답 시간 | - |
| 최소 응답 시간 | - |
| 최대 응답 시간 | - |
| p(90) 응답 시간 | - |
| p(95) 응답 시간 | - |
| p(99) 응답 시간 | - |
| 총 요청 수 | - |
| 초당 요청 (TPS) | - |
| 실패율 | - |

### 시나리오별 결과

| API | 평균 응답시간 | p(95) | 성공률 |
|-----|--------------|-------|--------|
| 로그인 (POST /api/v1/login) | - | - | - |
| 대시보드 (GET /api/v1/dashboard) | - | - | - |
| 사용자 목록 (GET /api/v1/admin/system/users) | - | - | - |
| 게시글 등록 (POST /api/v1/boards/posts) | - | - | - |

## 관찰 사항

### 특이사항
- (미실행)

### 병목 지점
- (미분석)

## 개선 권고사항

- (미정)

## 첨부 파일

- HTML 리포트: `test/load-tests/results/report-100-{timestamp}.html`
- JSON 결과: `test-results/k6/results.json`

---

**테스트 상태**: ⚠️ k6 설치 필요

## k6 설치 방법

### 방법 1: 수동 다운로드

1. https://github.com/grafana/k6/releases/download/v1.7.1/k6-v1.7.1-win-amd64.zip 다운로드
2. 압축 해제
3. k6.exe 를 PATH 가 있는 디렉토리로 복사 (예: `C:\Windows\System32`)

### 방법 2: Scoop 사용 (권장)

```powershell
# Scoop 설치 (이미 설치된 경우 생략)
irm get.scoop.sh | iex

# k6 설치
scoop install k6
```

### 방법 3: Chocolatey 사용

```powershell
# Chocolatey 설치 (이미 설치된 경우 생략)
choco install k6
```

### 설치 확인

```powershell
k6 version
```
