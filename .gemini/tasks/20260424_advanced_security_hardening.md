# 20260424_advanced_security_hardening.md

## 개요
- API 문서 보안, 의존성 감사, 속도 제한 고도화 및 세션 관리 강화 작업 수행

## 진행 상태
- [x] **Task 1: API 문서(Swagger) 보안 강화** ✅
  - 운영 프로파일(`prod`)에서 Swagger UI 및 API Docs 비활성화 설정 적용
- [x] **Task 2: 프론트엔드 종속성 보안 감사** ✅
  - `npm audit`을 통한 취약점 점검 및 가능한 수정 사항 적용
- [x] **Task 3: 속도 제한(Rate Limiting) 고도화** ✅
  - `Bucket4j` 라이브러리 도입 및 토큰 버킷 알고리즘 적용
  - 로그인 엔드포인트에 대한 가중치(5x) 적용으로 Brute-force 방어 강화
- [x] **Task 4: Docker 배포 환경 최적화 검토** ✅
  - Non-root 사용자 및 멀티스테이지 빌드 적용 확인
- [x] **Task 5: 리프레시 토큰(Refresh Token) 기반 세션 관리 강화** ✅
  - DB(`NREFRESH_TOKEN`) 연동을 통한 서버 측 토큰 검증 로직 구현
  - 로그아웃 시 서버 측 토큰 즉시 무효화 처리

## 체크리스트
- [x] 운영 환경에서 `/swagger-ui/index.html` 접근이 차단되는가?
- [x] 단시간 내 다량의 로그인 시도 시 `429 Too Many Requests`가 발생하는가?
- [x] 로그아웃 후 기존 리프레시 토큰을 사용한 토큰 재발급이 차단되는가?
- [x] 전체 프로젝트 빌드가 성공하는가?
