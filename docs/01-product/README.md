# 01-product — 제품 문서

이 디렉터리는 제품 목표·사용자·범위·성공 기준처럼 **제품 결정을 설명하는 현행 문서**를 둔다.
[UI/UX 현대화 제품 brief](ui-ux-modernization-brief.md)는 활성 `Draft`이고, [정보구조·URL·민감 상태 의사결정 패키지](information-architecture.md)는 ADR-0004로 hybrid를 검증용 잠정 방향으로만 선택했다. exact IA·route disposition·URL 정책은 제품 소유자·IA·security/privacy 승인 전 `blocked-input`이므로 연구 결과나 승인된 PRD·최종 IA로 간주하지 않는다. `docs/archived/PRD.MD`와 `TRD.MD`는 과거 스냅샷일 뿐 현재 상태의 근거로 사용하지 않는다.

## 현재 판단에 사용할 원본

| 질문 | 우선 확인할 원본 |
|---|---|
| 제품의 목적, 모듈, 실행 방법 | [루트 README](../../README.md) |
| UI/UX 현대화의 제품 목표, 사용자 연구·baseline·성공 기준 | [ui-ux-modernization-brief.md](ui-ux-modernization-brief.md) — 승인 전 Draft |
| 목표 IA, 119 route disposition, 로그 URL allowlist와 전역 URL 후속 결정 경계 | [information-architecture.md](information-architecture.md) — ADR-0004 hybrid 잠정 방향; `PD-UX-001/002`와 exact IA는 `blocked-input`, 전역 후속 결정은 미등록 |
| 코어와 선택 기능의 제품 경계 | [ADR-0001](../02-architecture/decisions/ADR-0001-core-app-product-boundary.md) |
| 프런트엔드 지원 언어 | [ADR-0002](../02-architecture/decisions/ADR-0002-korean-first-frontend.md) |
| 현재 구현·의존성·버전 | 현재 코드와 빌드 설정, [.agent/memory/project-context.md](../../.agent/memory/project-context.md)의 근거 링크 |
| 아직 결정되지 않은 제품 사안 | [pending-decisions.md](../04-operations/pending-decisions.md) |
| 신규 프로젝트 생성 범위 | [reusable-base-guide.md](../03-guides/reusable-base-guide.md)와 `config/reusable-base-profiles.json` |

진행률이나 완료 선언은 오래 유지되는 제품 문서에 복제하지 않는다. 현재 상태는 코드·설정·required CI를 직접 확인하고, 장기 제품 결정은 ADR로 남긴다.

## 새 제품 문서 작성 기준

- 파일명은 `kebab-case.md`로 작성하고 [문서 인덱스](../README.md)에 등록한다.
- 제품 목표, 비목표, 사용자, 범위, 성공 기준, 결정권자를 명시한다.
- 구현 작업 일지·커밋 목록·완료 체크리스트는 넣지 않는다. 필요한 이력은 Git·PR·ADR에서 추적한다.
- 과거 문서를 부분 갱신하지 않고, 현행 요구를 새 문서로 작성해 역사 스냅샷과 경계를 분명히 한다.

---
*Status: UI/UX 현대화 brief·IA decision package Draft(`blocked-input`) · Verified: 2026-08-21*
