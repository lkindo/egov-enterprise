---
name: owasp-security-auditor
description: 인증·인가·입력·민감 데이터 변경을 공격 경로와 음성 테스트 중심으로 감사한다.
version: 2.0.0
---

# OWASP Security Auditor

## 사용 시점

Spring Security filter chain, JWT/cookie, `frontend/src/proxy.ts`, `AuthContext`, controller/service 인가, 파일 처리 또는 사용자 입력 SQL을 바꿀 때 사용한다.

## 감사 절차

1. 신뢰 경계와 노출 endpoint, 자산, 공격자 권한을 식별한다.
2. 인증 우회, BOLA/IDOR, 역할 상승, CSRF/XSS, injection, 민감정보 노출, rate-limit·오류 처리 영향을 검토한다.
3. 정상 경로뿐 아니라 미인증·권한 부족·타인 리소스·위조/만료 credential의 음성 테스트를 확인한다.
4. 프런트 proxy는 UX상의 1차 경계일 뿐 최종 인가로 간주하지 않는다. 백엔드 controller와 service 계층에서 다시 검증한다.
5. 현재 세션 모델은 HttpOnly cookie와 서버 검증을 기준으로 확인한다. 브라우저 저장소에 access token을 새로 노출하지 않는다.

## 구체 체크

- cookie의 `HttpOnly`, `Secure`, `SameSite`, scope와 CSRF 방어가 배포 환경에 맞는가?
- object ID를 받는 endpoint가 소유자 식별자 축과 관리자 우회 의미를 정확히 검증하는가?
- `@PreAuthorize` 존재뿐 아니라 표현식·역할 의미와 service 2차 가드가 맞는가?
- CORS/CSP/보안 header가 환경별로 과도하게 열리지 않았는가?
- JPQL/SQL과 경로·파일명이 parameter binding·allowlist를 사용하는가?
- 오류가 token, stacktrace, 내부 topology 또는 개인정보를 노출하지 않는가?

## 결과

검토한 공격면, 실제 exploit 가설, 확인된 방어와 테스트, 발견한 문제, 적용한 최소 수정, 미확인 동적 검증을 구분한다. 정적 검색만으로 “완전 차단” 또는 “OWASP 준수 완료”를 선언하지 않는다.
