# [Task] 테스트 커버리지 보완 태스크 (3차 확장 - Note & Schedule)

- **작성일**: 2026-05-22
- **목표**: `Note` 및 `Schedule` 도메인의 JPA 엔티티들의 Instruction 커버리지를 100% 달성하고, 전체 백엔드 커버리지 리포트 지표를 추가적으로 확보.

## 체크리스트

### Phase 1: 준비 및 상황판 기록 [100%]
- [x] 태스크 등급 판정 및 TASK PROPOSAL 제안
- [x] 로컬 및 글로벌 아티팩트 상황판 생성 (`task.md`, `20260522_coverage_improvement_v3.md`)

### Phase 2: Note 도메인 단위 테스트 보완 [100%]
- [x] `NoteDomainTest.java` 수정 적용 (Note, NoteRecptn, NoteTrnsmit 100% 전수 타격)
- [x] `.\gradlew :business-suite:test --tests "nuri.business.domain.note.*"` 단위 검증 통과

### Phase 3: Schedule 도메인 단위 테스트 3종 신설 [100%]
- [x] `ScheduleTest.java` 신설 (Schedule 100% 전수 타격)
- [x] `LeaderScheduleTest.java` 신설 (LeaderSchedule 100% 전수 타격)
- [x] `MemoTodoTest.java` 신설 (MemoTodo 100% 전수 타격)
- [x] `.\gradlew :business-suite:test --tests "nuri.business.domain.schedule.*"` 단위 검증 통과

### Phase 4: 전체 빌드 및 리포트 갱신 [100%]
- [x] `.\gradlew clean jacocoRootReport --no-build-cache --rerun-tasks` 실행 및 전체 성공 검증 (BUILD SUCCESSFUL in 8m 5s)
- [x] `walkthrough.md` 결과 갱신 및 마감
