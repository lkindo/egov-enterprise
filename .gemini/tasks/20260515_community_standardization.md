# 20260515_community_standardization.md

## 1. Task Objective
- 커뮤니티(Community) 및 블로그(Blog) 도메인의 Java 레이어 전수 표준화 (v5 schema compliance)
- 표준 약어 적용 (`ttl`, `typeCd`, `wdrlYmd` 등)

## 2. Target Files
### Community Domain
- `nuri.foundation.domain.system.content.community.Community`
- `nuri.foundation.domain.system.content.community.CommunityUser`
- `nuri.foundation.domain.system.content.community.CommunityRepository`
- `nuri.foundation.domain.system.content.community.CommunityUserRepository`
- `nuri.foundation.service.system.content.community.CommunityService` (예상)

### Blog Domain
- `nuri.business.domain.board.Blog`
- `nuri.business.domain.board.BlogRepository`
- `nuri.business.service.board.BlogService` (예상)

## 3. Standardization Rules (v5)
- `nm` -> `ttl` (Title)
- `regSeCd` -> `regTypeCd` (Registration Type Code)
- `whdwlYmd` -> `wdrlYmd` (Withdrawal Date)
- `at` -> `yn`
- `sj` -> `ttl`

## 4. Progress Checklist
- [x] Community 엔티티 및 리포지토리 표준화
- [x] CommunityUser 엔티티 및 리포지토리 표준화
- [x] Blog 엔티티 및 리포지토리 표준화
- [x] 관련 DTO 및 서비스 레이어 동기화
- [x] 전체 빌드 검증 및 컴파일 에러 해결

## 5. Verification Log
- 2026-05-15: Task Started.
- 2026-05-15: Community, Blog 도메인 표준화 완료.
- 2026-05-15: Gradle 전체 모듈 컴파일 성공 확인.
