# 테스트 결과 기록 (Test Records)

이 디렉토리는 부하 테스트 결과를 기록하는 곳입니다.

## 파일 목록

| 파일 | 설명 | 상태 |
|------|------|------|
| `100-users-results.md` | 100 명 부하 테스트 결과 | 📋 템플릿 준비 |
| `500-users-results.md` | 500 명 부하 테스트 결과 | 📋 템플릿 준비 |
| `1000-users-results.md` | 1000 명 부하 테스트 결과 | 📋 템플릿 준비 |

## 테스트 실행 방법

### 1. k6 설치 확인

```powershell
k6 version
```

### 2. 백엔드 서버 시작

```powershell
cd d:\project\egov-enterprise
./gradlew :api-server:bootRun --args='--spring.profiles.active=test'
```

### 3. 부하 테스트 실행

```powershell
# 100 명 테스트
k6 run --scenario users-100 test/load-tests/scenarios/load-levels.js

# 500 명 테스트
k6 run --scenario users-500 test/load-tests/scenarios/load-levels.js

# 1000 명 테스트
k6 run --scenario users-1000 test/load-tests/scenarios/load-levels.js
```

### 4. 결과 기록

각 테스트 실행 후 해당 파일에 결과를 기록하세요:

- 콘솔 출력 캡처
- HTML 리포트에서 메트릭 복사
- 특이사항 및 병목 지점 기록

## 결과 파일 구조

각 결과 파일에는 다음 정보가 포함됩니다:

- 테스트 개요 (일시, 부하 레벨, 시나리오)
- 테스트 환경 (서버, 클라이언트)
- 임계값 결과
- 성능 메트릭 (응답시간, TPS, 실패율)
- 시나리오별 결과
- 관찰 사항 및 병목 지점
- 개선 권고사항

## 참고 문서

- [LOAD_TEST_GUIDE.md](../docs/LOAD_TEST_GUIDE.md) - 상세 테스트 가이드
- [INSTALL_K6.md](../INSTALL_K6.md) - k6 설치 가이드
- [QUICKSTART.md](../QUICKSTART.md) - 빠른 시작 가이드

---

**Last Updated**: 2026-04-01
