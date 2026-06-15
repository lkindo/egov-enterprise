# 2026-06-15 백엔드 아키텍처 헌법 2차 개정 (God Class 및 OOM 방어)

## 1. 개요
백엔드 헌법 제4조(변환 책임의 소재) 및 제14조(N+1 방어 전략)에 내포된 비즈니스 레이어 비대화 현상(God Class 조장) 및 무분별한 Fetch Join 강제에 따른 OOM(Out of Memory)/카테시안 곱 에러 위험을 영구 제거하기 위해 헌법 조항을 개정함.

## 2. 체크리스트 (Ralph Loop)
- [x] **Think** — 문제 원인(비즈니스 책임 과적, 페이징+FetchJoin 충돌) 도출 및 보완 가설 수립
- [x] **Plan** — 제4조(Facade 분리 격리), 제14조(Lazy+Batch 하이브리드 전략) 개선안 제안 및 승인
- [x] **Implement** — `backend-api-constitution.md` 제4조, 제14조 원문 개정 완료
- [x] **Test** — `./gradlew compileJava compileTestJava` 실행하여 Java 타입 무결성 검증 (BUILD SUCCESSFUL 확인)
- [x] **Summarize** — 분석 아티팩트(`analysis_results.md`) 갱신 및 사용자 최종 보고 완료

## 3. 세부 변경 사항
1. **비즈니스 응집도 강화 및 Facade 격리 (제4조 개정)**
   - API 응답 DTO 조립 책임을 비즈니스가 아닌 진입점 `api-server`의 Facade 계층으로 전면 상향 이관하여 비즈니스 서비스 거대화 차단.
   - 데이터 변경이 없는 복합 조회성 화면의 경우 비즈니스 서비스를 우회하여 QueryDSL 등 조회 전용 쿼리 프로젝션 명시적 허용(CQRS 지향).
2. **Fetch Join 하이브리드 전략 명시 (제14조 개정)**
   - `XToOne` 관계는 기존처럼 Fetch Join을 필수적으로 적용.
   - 다중 컬렉션 및 페이징이 동반된 `XToMany` 관계는 DB Limit/Offset이 박탈되는 인메모리 페이징 폭발(OOM) 방지를 위해 Fetch Join을 전면 금지함.
   - 그 대안으로 `@BatchSize` 또는 `default_batch_fetch_size`를 통한 `In-clause` 병합 지연 로딩을 공식 표준 방어 기제로 채택하여 성능과 안정성을 동시 확보.
