# ADR-0018: 기술 계약·정기 검토·기관 도입 승인 분리

- 상태: Accepted
- 결정일: 2026-09-14
- 승인 근거: 사용자가 재사용 프레임워크와 레거시 이관 도구의 장기 사용을 위해 제시된 “D + E, 이후 F 확대”를 명시 승인했다. 후속 정합 감사에서 확인한 산출물 하네스·원장·메모리·실행 경계의 권장 수정 순서도 승인했다.
- 범위: URL-state, route capabilities, UI quality, KRDS 매핑, 화면 용어·E2E duration profile의 일반 최신성, 프로필별 산출물 검증과 원장·메모리 투영, 온라인 제품·독립 migration-tool의 기관 도입·실행 검증.
- 대체: DEC-OPS-027 ③과 DEC-OPS-087 ②의 **일반 검토 일정 경과를 기술 CI 실패로 처리하는 부분**, UI quality의 같은 달력 기반 차단. 원래 결정의 다른 통제와 승인 이력은 유지한다.
- 관계: [ADR-0007](ADR-0007-reference-default-ia-approval.md)의 참조 구현과 기관 검증 분리를 구체화한다. [ADR-0009](ADR-0009-controlled-url-search-state.md)의 검색 범위·잔여 위험, [ADR-0008](ADR-0008-multi-source-approved-migration-workflow.md)의 이관 쓰기 승인·무결성 계약은 유지한다.

## 배경과 선택지

기존 검사는 코드·승인 근거가 같은 상태에서도 `reviewBy`가 지나면 required CI를 실패시켰다. URL-state는 검토 기한이 지난 승인 부류를 검색 허용 목록에서도 제외했다. 원본 제품의 검토 날짜를 복사한 축소 프로필과 프론트 없는 이관 도구도 저장소 공통 검증의 영향을 받을 수 있었다.

기한을 반복 연장하는 방법은 복제 프로젝트마다 관리 비용을 남긴다. 날짜와 오류를 전부 제거하면 실제 위반과 미검토 사실까지 가려진다. 선택한 방법은 기술 계약의 변경 판정, 실제 시계로 관측하는 검토 최신성, 기관·환경에 결속된 사용 승인을 각각 검증하는 것이다.

## 결정

1. **기술 계약은 일반 검토 일정과 독립적으로 판정한다.** 이 범위의 `reviewBy`·`checkBy`는 기존 정기 검토 일정으로 보존한다. 날짜 형식, 소유자, 검토일과 일정의 순서, UI quality의 검토 시점 기준 90일 상한은 계속 검사한다. 경과만으로 정상 승인·검색 범위를 폐기하지 않는다.
2. **실제 위반과 미검토는 유지한다.** 새 자격증명 key, 새 검색 surface, 승인 범위 확대, census drift, 해시·근거 불일치는 해당 기술 계약에서 실패한다. 생성 census의 `unverified`, `blocked-input`, UI의 `unmeasured` 등을 자동 승인하거나 측정 완료로 바꾸지 않는다. 승인 원장의 전체 census 해시 결속은 이번 단계에서 유지한다.
3. **실제 시계로 정기 검토 상태를 보고한다.** 별도 보고 명령과 예약 워크플로가 검토 예정·기한 경과·미완료를 드러낸다. 기한 경과는 기술 CI의 실패를 대신하는 운영 후속 작업이다. 보고서를 만들 수 없는 형식·근거 오류까지 경고로 낮추는 것은 아니다.
4. **기관 사용 승인은 제품·프로필·환경에 결속한다.** 온라인과 migration-tool은 각각 `pending` 원장을 제공한다. 실제 소유자, UTC `reviewedAt`·`validUntil`, 현재 소스·정책 범위 digest, 통제별 파일·SHA-256 근거를 확인한다. 대상 불일치·미승인·누락·변조·기관 승인 유효기간 경과는 기관 preflight에서 실패한다. 기관 승인은 참조 제품의 CI·릴리스에 일괄 요구하지 않고 해당 기관의 배포·이관 절차에 연결한다.
5. **재사용 생성물은 원본 근거와 현재 관측을 구분한다.** 원본 census·승인 원장은 해시가 붙은 snapshot으로 보존하고, active census는 투영 후 소스에서 재생성한다. 동일한 관측과 소스가 남은 범위만 기존 승인 selector에 정확히 결속한다. 원본 검토자·날짜·근거를 새로 쓰지 않으며, 기관 환경 검토는 항상 `pending`으로 시작한다.
6. **migration-tool의 기술 검증은 독립 실행한다.** 모듈 테스트·bootJar 경로에 UI 검토 날짜를 요구하지 않는다. 환경 검토에는 source/target identity, mapping·schema·driver, 복구·cutover 근거를 요구하되 ADR-0008의 discover → plan → validate → load 승인 artifact를 대체하지 않는다.

### 후속 정합 감사에 따른 확장

7. **축소 제품도 생성 후 기술 게이트를 통과해야 한다.** `base:verify`는 격리 DB·소스를 생성하여 세 프로필에 같은 계약·Java 하네스·실 DB 스키마·프런트 타입·lint·build 경로를 적용한다. CI는 세 프로필 결과를 required `backend-build`에 집계한다. 기존 DEC-OPS-077 ⑤의 축소 프로필 red를 adopter에게 넘기는 통과 기대치는 이 계약으로 대체하며, 기관 고유 변경의 DEC-OPS-019 재검토 의무는 유지한다.
8. **검사 모집단은 명시 소유권에서 도출한다.** 하네스 retained/removed source와 UI scenario·pilot·KRDS scope는 원본 pack 계약과 실제 소스를 정확히 대조한다. 파일 부재만으로 비대상을 만들지 않는다. 적용 제외 사유와 upstream snapshot을 보존하며 원본 제품 회귀 테스트와 생성물 운영 계약의 실행 경로를 분리한다. 브랜드 프로필은 기능 pack과 별개다.
9. **승계 근거와 기억은 변경된 제품의 승인이 아니다.** sourceBindings·snapshot·selector·원장 모집단·profile lock의 무결성을 검사한다. 생성 메모리는 원본 사실을 upstream 이력으로 연결하고 현재 기관 원장을 정본으로 가리킨다. 온라인·이관 원장은 모두 pending으로 시작한다. 산출물 개발로 증거의 전제가 바뀌면 재검토가 필요하며 해시 재작성으로 자동 재승인하지 않는다.
10. **실제 실행 대상까지 기관 승인에 결속한다.** `execution-artifacts` 통제에 image digest 또는 JAR·mapping·inventory·plan 및 실행 descriptor를 결속한다. 기관 wrapper는 승인 확인 → 제품 기술 검증 → 승인·대상 재확인 뒤 명시적 실행에서만 기존 deploy/load 경로를 호출한다. 기본 동작은 검사이고, 기존 ADR-0008의 live identity·plan·driver·쓰기 경계는 그대로 둔다.
11. **E2E duration의 경과도 보고한다.** 120일 경과는 `performanceEvidence`의 최신성 신호로 옮기며 성공 실행 provenance·정확한 spec 집합·양수 duration·미래 시각 금지는 유지한다. 과거 성능 측정을 새 실행으로 표시하지 않는다.

## 경계와 결과

| 상황 | 판정 |
|---|---|
| 같은 소스·정책·승인으로 일반 재검토일 경과 | 기술 판정 유지, 운영 보고에 기한 경과 표시 |
| 새 query·credential 또는 승인 근거 불일치 | 해당 기술 계약 실패 |
| 기관 검토 전의 참조 제품 개발·빌드 | 기술 검증 가능, 기관 운영 준비 완료로 표시하지 않음 |
| 기관 승인 대상·소스·근거 변경 또는 `validUntil` 경과 | 기관 preflight 실패 |
| 프론트 없는 독립 이관 도구 | UI 검토는 해당 없음, 이관 전용 통제 검증 |

이 결정은 모든 날짜 검사를 제거하지 않는다. SAST·ZDM·skip waiver 등 실제 예외의 만료, 인증 세션·토큰 만료, 이관 승인 경계, 다른 용도의 증거 수명은 각 정본 정책을 유지한다. 정기 검토 보고는 운영 근거의 내용을 자동 심사하지 않으며 기관 승인 원장의 통과만으로 실제 인가·로그 설정·백업 복구·접근성을 실측했다고 주장할 수 없다.

과거 core 하네스 19건 실패는 문제를 확인한 역사적 측정이며 현재 허용 실패 수가 아니다. 날짜 분리·원장 투영만으로 전체 검증 완료를 선언하지 않고 실제 프로필 runner 결과로 판단한다. 기술 검증을 통과해도 기관별 브라우저 시나리오·운영 인가·접근성·복구 실증은 별도다.

## 후속 확대

F의 첫 pilot은 `/search`의 `q`로 제한한다. 공통 선언·parser·serializer가 서버 입력·검색 폼·명령 센터를 연결하고 중복·길이·타입·Unicode·미선언 key와 기존 북마크 값 보존을 검증한다. 기존 네이티브 GET과 ADR-0009의 검색 accepted-risk를 유지한다. 다른 화면은 목적·키·값·소유권과 직접 query 조작 우회 검사를 검토한 뒤 확대한다. 기존 화면 일괄 재작성, 부류 자동 승인, 해시 재계산을 승인으로 간주하는 방식은 포함하지 않는다.

## 실행 근거

- [운영 검토·기관 도입 가이드](../../03-guides/governance-review-lifecycle.md)
- [URL-state 계약](../../../scripts/ui-url-state-census.mjs), [승인 계약](../../../scripts/ui-url-state-approval-contract.test.mjs)
- [기관 승인 검증](../../../scripts/adoption-review.mjs), [거버넌스 투영](../../../scripts/reusable-governance-projection.mjs)
- [프로필 검증 driver](../../../scripts/verify-reusable-base.mjs), [산출물 무결성](../../../scripts/reusable-governance-integrity.mjs), [review scope 계약](../../../config/governance/reusable-review-scopes.json)
- [기관 실행 진입점](../../../scripts/adoption-execute.mjs), [CI 프로필 matrix](../../../.github/workflows/ci.yml)
- [재사용 Base 검증과 잔여](../../03-guides/reusable-base-guide.md), [활성 Gap](../../../.agent/memory/known-gaps.md)
