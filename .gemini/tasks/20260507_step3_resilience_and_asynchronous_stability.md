# Task: 도메인 회복력 강화 및 비동기 안정성 확보 (Step 3)

## 1. 개요
외부 시스템(SMTP, SMS 게이트웨이) 연동 실패에 대비한 재시도 메커니즘을 도입하고, 비동기 작업의 안정성을 강화한다.

## 2. 작업 내용
- [x] **Spring Retry 의존성 추가**: `libs.versions.toml` 및 `business-suite/build.gradle`에 `spring-retry`, `spring-boot-starter-aop` 반영.
- [x] **전역 재시도 활성화**: `AsyncConfig`에 `@EnableRetry` 추가.
- [x] **메일 발송 회복력 강화**: `MailAsyncProcessor`에 `@Retryable`(최대 3회, 2초 간격) 및 `@Recover`(최종 실패 처리) 적용.
- [x] **SMS 발송 회복력 강화**: `SmsAsyncProcessor`를 개별 수신자 단위로 재시도하도록 리팩토링 및 `@Retryable`, `@Recover` 적용.
- [ ] **조회수 쓰기 지연(Write-behind) 검토**: Redis 도입 일정에 맞춰 향후 단계로 이월 또는 인메모리 방식 검토.

## 3. 검증 결과
- `gradlew :business-suite:classes` 실행 결과 성공.
- 비동기 예외 발생 시 전파 경로 및 Checked Exception 처리 완료.

## 4. 다음 단계
- Step 4: 성능 최적화 및 기술 부채 최종 정리.
- Redis 인프라 확정 시 조회수 동기화 로직 구현.
