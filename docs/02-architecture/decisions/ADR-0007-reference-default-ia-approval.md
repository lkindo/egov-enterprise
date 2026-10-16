# ADR-0007 — 하이브리드 IA를 참조-기본(reference-default) IA로 승인하고 G1 증거 요건을 채택 시점으로 이전한다

**Status:** Accepted
**Date:** 2026-08-23
**Deciders:** lkindo (Product owner · IA owner · Security/Privacy owner — DEC-OPS-013 지명)
**Supersedes:** - (ADR-0004의 하이브리드 방향을 유지·확정하며, 그 "잠정" 지위와 승인 대기 경계를 참조-기본 범위에서 종료한다)

## Context

ADR-0004는 과업 중심 내비게이션 + 명시적 관리 센터의 하이브리드 IA를 prototype·research의 **잠정** 방향으로 채택하면서, final IA 승인 전 consumer migration을 금지했다. 그 final 승인(G1)의 증거 요건은 [IA 문서](../../01-product/information-architecture.md)가 정의한다: live DB 메뉴/권한 census, 역할별 카드소트·트리테스트(§11.8: 독립 홀드아웃에서 성공률 ≥80% 등), 접근성 AT 라운드, 119+2 route disposition 승인, 보안/프라이버시 URL 검토.

2026-08-23 G1 decision workshop(참석: lkindo — 세 owner 역할, DEC-OPS-013)에서 증거를 상정한 결과, 요건 중 두 클래스가 **오늘 미비한 것이 아니라 이 저장소의 성격상 구조적으로 존재할 수 없음**이 확인됐다:

- **live DB census** — 이 저장소는 참조 구현(reference implementation)이자 재사용 base다(ADR-0001, 브리프 §1). 운영 배포·운영 DB·운영 메뉴 데이터가 존재하지 않는다. `DB_HOST` 미설정은 설정 누락이 아니라 대상의 부재다.
- **실사용자 연구** — 실사용자·조직·업무 맥락은 채택 기관이 생기는 순간에야 존재한다. 참조 구현 자체의 "역할별 ~5명 홀드아웃"은 모집 대상이 없다.

즉 현행 G1 요건은 참조 구현 자체에는 영구 미충족이며, 이대로 두면 IA는 어떤 시점에도 승인될 수 없다.

워크숍에 상정된 **존재하는** 증거: ADR-0004의 구조 근거(hash-bound), 119 route + 별칭 2개의 정적 census와 fail-closed disposition overlay 장치(IA §8.4), URL-state 정적 census 523 records, seed 유래 메뉴 구조(마이그레이션 90행).

## Decision

1. **G1을 참조 범위로 재정의한다.** 참조 구현에 대한 G1은 "채택 기관의 검증된 IA 승인"이 아니라 "**참조-기본(reference-default) IA 승인**"이다 — 파생 제품이 출발점으로 삼는 기본 메뉴 구조를 확정하는 결정이다.
2. **하이브리드 IA(ADR-0004 방향)를 참조-기본 IA로 승인한다** (PD-UX-001, 참조-기본 범위). ADR-0004의 "잠정" 지위는 종료된다.
3. **연구·live census·AT 증거 요건은 기관 채택 시점의 재검증 의무로 이전한다.** 어떤 기관이 이 base를 채택하는 시점에, 그 기관의 실사용자·실메뉴·실권한으로 IA 문서의 원 요건(§11.8 연구 기준 포함)에 따른 G1을 다시 수행해야 하며, 참조-기본 IA는 그 재검증의 출발 가설이지 결론이 아니다.
4. **route별 disposition은 이 결정으로 일괄 승인되지 않는다.** disposition overlay는 `proposed`로 유지되며, 개별 route의 처분은 IA §8.4의 fail-closed 장치를 통해 owner PR 리뷰(DEC-OPS-013 승인 채널)로 개별 승인한 뒤에만 menu/generator가 소비할 수 있다.
5. **PD-UX-002(로그/URL 프라이버시 분류)는 보류를 유지한다.** 분류는 면제 대상이 아니라 수행 대상이다 — 523 record의 분류 초안 작성이 별도 태스크로 선행된다.

## Accepted risk (영구 기록)

이 승인은 **사용자 연구 없이** 이루어졌다. 하이브리드 구조가 실사용자의 mental model과 어긋날 위험은 검증되지 않은 채 남으며, 그 위험은 기관 채택 시점의 재검증까지 참조-기본 IA가 부담한다. 이 사실은 "사용자 검증 완료"로 표현될 수 없고, 파생 제품 문서가 참조-기본 IA를 인용할 때도 동일한 한계를 승계한다.

## 이 결정이 바꾸지 않는 것

- G0(제품 정의 게이트)의 미통과 상태 — 대상 기관·critical role 입력은 채택 시점 문제로 남는다.
- PD-UX-002와 로그 URL 분류 승인(IA-OI-03 잔여, IA-OI-08).
- krds-standard(공식 정부 identity) 관련 금지(기관 자격 필요).
- 접근성 적합성 주장 금지(DEC-OPS-012, GAP-UIQ-001).
- disposition overlay의 per-route fail-closed 승인 절차(IA §8.4)와 그 계약 테스트.

## 이 결정이 여는 것

- 참조-기본 IA를 향한 내비게이션 설계·구현 작업: route disposition 초안 작성, 레이블/그룹 제안, 그리고 owner PR 리뷰를 통한 개별 승인. 승인된 disposition부터 menu/generator 소비가 가능해진다.
- ADR-0004가 "final IA 승인 전 금지"로 묶어 둔 활동들이, "참조-기본 IA 결정(본 ADR) + 해당 route의 개별 disposition 승인"을 전제로 진행 가능해진다.

## 정본 연결

- [ADR-0004](ADR-0004-provisional-hybrid-information-architecture.md) — 하이브리드 방향의 구조 근거(본 ADR이 그 잠정 지위를 종료)
- [IA 문서 §8.4·§13·§14](../../01-product/information-architecture.md) — disposition 장치, open input, 워크숍 결정 기록
- [pending-decisions](../../04-operations/pending-decisions.md) — PD-UX-001 잔여 범위(개별 disposition)와 PD-UX-002
- [DEC-OPS-013](../../../.agent/memory/decisions.md) — owner 지명과 승인 채널
