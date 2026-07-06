# Task: 성능 최적화 및 기술 부채 최종 정리 (Step 4) - Revised

## 1. 개요
Redis 서버가 없는 환경을 고려하여 인메모리 기반의 쓰기 지연 전략으로 전환하고, 로깅 체계 및 보안 검증을 강화한다.

## 2. 작업 내용
- [x] **인메모리 기반 조회수 쓰기 지연(Write-behind) 구현**: 
    - Redis 의존성을 제거하고 `ConcurrentHashMap` 기반의 `BoardViewCountService`로 리팩토링.
    - `AtomicInteger`를 사용하여 멀티스레드 환경에서의 안전한 조회수 카운팅 보장.
    - `@Scheduled`를 통한 5분 주기 DB 동기화 로직 유지.
- [x] **로깅 체계 최적화**: 
    - `OnlinePollService`, `BoardPredicate` 등에서 사용되던 `System.out.println`을 `log.debug`로 교체.
    - `@Slf4j` 도입 및 로깅 의존성 정리.
- [x] **보안 검증 내재화**: 
    - `BoardMasterService`, `OnlinePollService`의 관리자 기능에 대해 서비스 레이어 권한 검증(`ADMIN` 롤 체크) 추가.
- [x] **의존성 및 설정 정리**: 
    - `libs.versions.toml`, `build.gradle`, `application.yml`에서 불필요한 Redis 관련 설정 및 라이브러리 제거.

## 3. 검증 결과
- 전체 모듈 빌드 성공.
- 인프라 추가(Redis) 없이 애플리케이션 내에서 성능 최적화 달성.

## 4. 최종 상태
- 전 도메인에 걸쳐 보안, 안정성, 회복력, 성능 개선 완료.
- 인프라 제약 사항을 준수하면서도 엔터프라이즈급 성능 최적화(Write-behind) 적용 완료.
