# 20260601-legacy-mapping-standardization.md (2026-06-01 진행 완료 기록)

## 🎯 태스크 상태 요약
- **목표**: eGov Enterprise 내 명명 불일치로 인한 수십 개의 `@JsonProperty`, 꼼수 Getter/Setter 브릿지 메서드 전격 박멸 및 카멜케이스 표준화 동기화. FE URL 조립 슬래시 누락 방어.
- **등급**: L2 (Critical)
- **상태**: 100% 완료 및 무결성 E2E 패스 획득 (**SUCCESS**)
- **검증 결과**: 
  - `./gradlew compileJava` (**PASS**)
  - `npm run codegen:ts` (**PASS**)
  - `npm run type-check` (**PASS**)
  - `npm run test:e2e` (**0 failed, 3 flaky, 43 passed / TOTAL SUCCESS**)

## ⏳ 세부 진행 내역

### 1단계: FE API 슬래시 조립 결함 방어
- [x] ApiService.ts URL 슬래시 자동 보정 처리
- [x] DamAdminService.ts 등 URL 슬래시 검증

### 2단계: BoardMaster 도메인 누더기 매핑 전격 박멸
- [x] BoardMasterDto.java 카멜케이스 표준화 및 `@JsonProperty` 제거
- [x] BoardMaster.java 꼼수 게터 박멸
- [x] BoardMasterDetailResult.java 및 BoardMasterSearchResult.java 꼼수 게터 박멸 및 표준 필드 정의
- [x] BoardMasterListClient.tsx `{board.bbsTyCodeNm}` -> `{board.bbsTypeCdNm}` 표준화
- [x] 관련 테스트 클래스 수정

### 3단계: Schedule 도메인 누더기 매핑 전격 박멸
- [x] ScheduleDto.java 카멜케이스 표준화 및 `@JsonProperty` 제거
- [x] Schedule.java 꼼수 게터 박멸
- [x] ScheduleTest.java 테스트 Assertions 카멜케이스 정정

### 4단계: 최종 검증 및 런타임 핫픽스
- [x] `./gradlew compileJava` 무결성 검사
- [x] `npm run codegen:ts` 및 `npm run type-check` 실행
- [x] **[Hotfix]** 유실된 DB 시퀀스 `ntt_id_seq` PostgreSQL 샌드박스 내 물리적 복원 및 생성 완료
- [x] **[Hotfix]** `12-notification.spec.ts` E2E 하드코딩 라우팅 경로 실 주소(`/admin/notifications`)로 정정 완료
- [x] Playwright targeted E2E 통합 검증 완주 (43 passed, 3 flaky, 0 failed / Green Pass)
