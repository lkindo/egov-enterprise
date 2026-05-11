# 도메인 보안 및 회복탄력성 가이드 (Domain Security & Resilience)

> 본 문서는 `GEMINI.md` 섹션 12에서 분리됨.

본 프로젝트는 엔터프라이즈급 안정성을 위해 다음의 도메인 가드레일을 준수한다.

## 1. 서비스 레이어 권한 재검증 (Double-Check Security)
- 컨트롤러의 권한 체크(`@PreAuthorize`)와 별개로, 서비스 레이어에서 `SecurityUtil`을 사용하여 리소스 소유자 또는 관리자 권한을 명시적으로 재검증한다.
- 특히 개인정보 수정, 비밀번호 변경, 결재 승인 등 민감한 작업에 필수 적용한다.

## 2. 상태 전이 유효성 검사 (Deterministic State Transition)
- 도메인 엔티티 내에 상태 전이 로직을 캡슐화하거나, 서비스 레이어에서 현재 상태를 체크하여 유효하지 않은 비즈니스 흐름(예: 이미 처리된 결재의 재수정)을 차단한다.

## 3. 비동기 작업의 회복탄력성 (Async Resilience)
- 외부 시스템(SMTP, SMS Gateway) 연동 시 반드시 `@Retryable`을 사용하여 일시적 장애에 대응한다.
- `@Retryable` 사용 시 self-invocation 문제를 방지하기 위해 반드시 self-injection(Lazy Autowired) 패턴을 사용한다.

## 4. 안전한 ID 생성 전략
- 고부하 상황에서의 충돌을 방지하기 위해 `System.currentTimeMillis()` 대신 `IdGenerationUtil`의 UUID 기반 ID 생성기를 사용한다.
