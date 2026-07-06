# [옵션 2] 행사(Event) 및 시스템 정책(SystemPolicy) 도메인 100% DB 표준화

## 작업 일자: 2026-05-22

### 진행 상태 및 개정 이력

1. **JPA 엔티티 및 복합키(ExternalHrId) 표준 카멜케이스 개정** (완료)
   - `EventInfo.java`, `ExternalHr.java`, `ExternalHrId.java`, `SystemPolicy.java` 필드명 및 비즈니스 로직 최신화
2. **DTO 개정 및 Jackson Dual Guard 구축** (완료)
   - `EventInfoDto.java`, `ExternalHrDto.java`, `PolicyService.Policy` DTO에 Jackson `@JsonProperty` 및 `@JsonAlias` 적용으로 하위 호환성 100% 보장
3. **Repository JPQL 쿼리 및 메소드 시그니처 수정** (완료)
   - `EventInfoRepository.java` 및 `ExternalHrRepository.java` 쿼리/시그니처 개정
4. **비즈니스 서비스 로직 및 API 컨트롤러 개정** (완료)
   - `EventInfoService.java`, `ExternalHrService.java`, `PolicyService.java` 및 API 컨트롤러 내 필드 매핑 교정
5. **1차 커밋 수행** (완료)
   - `git add .` 및 `git commit -m "refact: [opt 2] Event and SystemPolicy domain DB standardization 1st phase"` 수행 완료
6. **JUnit 단위/통합 테스트 코드 수정 및 백엔드 빌드 검증** (진행중)
   - `PolicyServiceTest.java` 수정 완료 (`policyType`, `title`, `content` -> `plcyTypeCd`, `plcyTtl`, `plcyCn` 정렬)
   - `PolicyApiControllerTest.java` 수정 완료 (Policy DTO 빌더 활용 초기화로 개정)
   - `.\gradlew test` 백엔드 JUnit 테스트 전체 검증 중

### 다음 작업 계획
- 백엔드 JUnit 테스트 패스 여부 확인 및 실패 케이스 교정 (자가 성찰 디버그 프로토콜 준수)
- 프론트엔드 API 타입 동기화 (`npm run codegen:ts` in `frontend/`)
- Playwright E2E 통합 테스트 (`npm run test:e2e` in `frontend/`) 실행 및 최종 검증 완료
