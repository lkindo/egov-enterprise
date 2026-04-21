# Security Reinforcement Task: 20260421_security_hardening

## 1. 개요
1차 보안 감사에서 식별된 고위험 요소(파일 업로드 취약점 및 관리자 권한 제어)를 해결하기 위한 보안 강화 작업입니다.

## 2. 세부 작업 계획
- [ ] **Task 2.1: 파일 업로드 확장자 화이트리스트 구현**
  - 대상: `business-suite` 모듈의 `FileService`
  - 내용: 실행 파일(.jsp, .exe, .sh, .bat 등) 및 위험 확장자 차단 로직 추가
- [ ] **Task 2.2: 관리자 API 메소드 레벨 권한 강화**
  - 대상: `UserApiController`, `DeptApiController` 등
  - 내용: `@PreAuthorize("hasRole('ADMIN')")` 어노테이션 명시적 추가
- [ ] **Task 2.3: Refresh Token 쿠키 보안 설정 수정**
  - 대상: `JwtTokenProvider`
  - 내용: `setSecure(true)` 및 환경 설정 연동

## 3. 진행 상태
- 시작일: 2026-04-21
- 상태: Completed ✅

### 작업 내역
- [x] **Task 2.1: 파일 업로드 확장자 화이트리스트 구현** (FileService.java 수정 완료)
- [x] **Task 2.2: 관리자 API 메소드 레벨 권한 강화** (UserApiController.java 수정 완료)
- [x] **Task 2.3: Refresh Token 쿠키 보안 설정 수정** (JwtTokenProvider.java 수정 완료)
