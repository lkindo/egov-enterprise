# 20260424_Security_Hardening_Phase2

## 작업 목표
- `security_best_practices_report.md` 에 보고된 [High] 등급의 보안 취약점 조치
- 프론트엔드 XSS 공격 방어 체계 구축
- 백엔드 구성 파일 내 하드코딩된 시크릿 및 비밀번호 제거

## 진행 상태
- [x] **Phase 1: Frontend XSS(크로스 사이트 스크립팅) 취약점 조치** ✅
  - [x] `isomorphic-dompurify` 패키지 설치
  - [x] `BoardDetailClient.tsx`의 `dangerouslySetInnerHTML` 소독 적용
  - [x] `policies/[type]/page.tsx`의 `dangerouslySetInnerHTML` 소독 적용
- [x] **Phase 2: Backend 시크릿 하드코딩 제거** ✅
  - [x] `application.yml`, `application-prod.yml` 파일 정리
  - [x] `.env` 연동 및 환경 변수 기반 주입 설정
- [x] **Phase 3: CORS 동적 설정 및 검증** ✅
  - [x] CORS 허용 오리진을 환경별(yml)로 분리
  - [x] 콤마 구분 문자열 방식으로 @Value 바인딩 오류 수정

## 체크리스트
- [x] XSS 방어 로직이 적용된 상태에서 UI가 정상적으로 렌더링되는가?
- [x] 환경 변수를 주입받아 백엔드가 정상적으로 부트되는가?
- [x] CORS 설정이 환경별로 올바르게 로드되는가?
- [x] E2E 테스트(모니터링)가 모두 통과하는가?
