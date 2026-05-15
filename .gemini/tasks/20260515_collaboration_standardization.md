# 20260515_collaboration_standardization.md

## 1. Task Objective
- Collaboration 도메인 (일정, 보고)의 Java 레이어 전수 표준화 (v5 schema compliance)
- 필드명 및 타입 정합성 확보를 통한 시스템 안정성 강화

## 2. Target Files
### Schedule Domain
- `nuri.business.domain.schedule.Schedule`
- `nuri.business.domain.schedule.LeaderSchedule`
- `nuri.business.domain.schedule.ScheduleRepository`
- `nuri.business.domain.schedule.LeaderScheduleRepository`
- `nuri.business.service.schedule.dto.ScheduleDto` (예상)
- `nuri.business.service.schedule.ScheduleService` (예상)

### Report Domain
- `nuri.business.domain.report.WorkReport`
- `nuri.business.domain.report.WorkReportRepository`
- `nuri.business.service.report.dto.WorkReportDto` (예상)
- `nuri.business.service.report.WorkReportService` (예상)

## 3. Standardization Rules (v5)
- `sj` -> `ttl`
- `cn` -> `cn` (Content) or `expln` (Description)
- `bgnde` -> `bgngYmd`
- `endde` -> `endYmd`
- `at` -> `yn`
- `se` -> `typeCd` or `seCd`
- `schdul` -> `schdl` (Abbreviation)

## 4. Progress Checklist
- [x] Schedule Domain 엔티티 표준화
- [x] Schedule Domain 레포지토리 및 DTO 표준화
- [x] Schedule Domain 서비스 레이어 표준화
- [x] Report Domain 엔티티 표준화
- [x] Report Domain 레포지토리 및 DTO 표준화
- [x] Report Domain 서비스 레이어 표준화
- [x] 전체 빌드 검증 및 컴파일 에러 해결

## 5. Verification Log
- 2026-05-15: Task Started.
- 2026-05-15: Schedule, WorkReport, MemoReport 도메인 표준화 완료.
- 2026-05-15: Gradle 전체 모듈 컴파일 성공 확인.
