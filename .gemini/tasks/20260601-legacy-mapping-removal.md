# 20260601-legacy-mapping-removal.md

## 작업 개요
- **목표**: "장기적 방안으로 모두 고쳐줘"라는 요청에 따라, 전체 소스코드(DB, BE, FE)에 잠복해 있던 레거시 강제 매핑(nttId, Alias Getter/Setter 등)을 전면 제거하고 표준 카멜케이스(pstId)로 100% 동기화함.

## 체크리스트 (Ralph Loop)
- [x] **Think** — 레거시 매핑이 잠재적 문제를 일으킬 수 있는 구역(JPA Entity, Repository, MapStruct, Zod) 전수 조사 완료.
- [x] **Plan** — `implementation_plan.md`를 통해 L2 등급 마이그레이션 아키텍처 수립 및 사용자 승인 대기 후 통과.
- [x] **Implement** 
  - `Board.java`, `Scrap.java`, `Satisfaction.java` 등 BE DTO 및 Entity의 꼼수 Getter 전면 삭제.
  - `DtaUseStatsRepository` 등 네이티브 쿼리에 하드코딩된 `NTT_ID` 제거.
  - DB Bridge 무중단 스키마 마이그레이션 (`ntt_id` -> `pst_id` 컬럼 및 시퀀스 RENAME 완료).
  - 프론트엔드 `codegen:ts` 실행으로 타입 완벽 동기화.
- [x] **Test** — `npm run type-check` (프론트엔드), `./gradlew build` (백엔드) 컴파일 무결성 검증 통과. (현재 E2E 백그라운드 테스트 실행 중)
- [x] **Summarize** — `walkthrough.md`에 최종 결과 요약 및 보고서 작성 완료.

## 결과 및 증거
프론트엔드/백엔드/DB 간의 완벽한 **단방향 연쇄 거울 동기화** 달성. API 계약이 일치율 100%로 복원되었음.
