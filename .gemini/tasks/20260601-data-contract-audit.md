# Task: DB-BE & BE-FE 데이터 전달 정확성 전수조사

## 1. 개요
DB ↔ BE(Java JPA), BE ↔ FE(TypeScript Zod) 간의 데이터 전송 정확성과 컬럼/필드 쌍(Pair) 일치성을 전수조사하여 런타임 API 오류 가능성이 있는 부분을 규명한다.

## 2. 체크리스트
- [x] **Think** — 요구사항 분석 및 기존 코드 영향 파악
- [x] **Plan** — 구체적 수정/추가 단계 정의 및 진단 스크립트 기획
- [x] **Implement** — DB 스키마 추출, BE Entity 맵 구축, OpenAPI DTO ↔ Zod schema 비교 검사
- [x] **Test** — 스크립트 실행으로 데이터 추출 및 오류 탐지 검증
- [x] **Summarize** — 종합 오류 리포트 및 해결방안 작성
