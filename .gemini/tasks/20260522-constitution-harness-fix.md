# 20260522-constitution-harness-fix.md - 3대 헌법 교정 및 Zod Compiler 이식

- **작업명**: 3대 헌법 모순 개정 및 Validation Mirroring 자동화 (Zod Compiler) 구축
- **목적**:
  - DB 물리 삭제 도입에 따른 백엔드 JPA 일괄 글로벌 필터 적용 모순 제거
  - 플랫 고대비 UI 룰과 Rich Aesthetics(글래스모피즘, 미세 모션)의 상호 보완적 통합 명문화
  - DTO 제약조건 ➔ Next.js Zod 스키마로 흐르는 동기화 고리의 정적 자동 코드젠(Zod Compiler) 파이프라인 신설
- **진행 상황**:
  - [x] Phase 1: 백엔드 헌법 (`backend-api-constitution`) 및 프론트엔드 헌법 (`frontend-ux-constitution`) 개정 적용 완료.
  - [x] Phase 2: `.agent/scripts/codegen-zod.js` 개발 및 실행 검증 완료. (153.42 KB Zod schema 파일 컴파일 완료)
  - [x] Phase 3: 최종 린트/타입 체킹 및 증적 확보 완료.
