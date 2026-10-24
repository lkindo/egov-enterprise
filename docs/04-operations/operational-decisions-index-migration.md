# 운영 결정 영역 색인 — 레거시 이관 도구

> 상태: 영역 결정 색인 — 이 저장소(원본)에서 독립 이관 도구(migration-tool)와 그 설계·운영 문서 경로를 고칠 때 읽는 운영 결정의 짧은 색인이다. 에이전트 진입점이 자동으로 읽지 않으며, 읽는 조건은 [공용 결정 인덱스](../../.agent/memory/decisions.md)의 「영역 결정 색인」 표가 정한다. 생성물(재사용 base·이관 제품)에 복사된 이 파일은 upstream 이력이며 도입 기관의 현재 결정이 아니다.

ID가 보관 원문의 앵커다: 각 행의 전문·이유·승인 근거는 [보관 기록](../archived/operational-decisions-history.md)의 `#<ID 소문자>` 절에 있다. 어느 경로를 고치든 걸리는 결정과 Accepted ADR 은 [공용 결정 인덱스](../../.agent/memory/decisions.md)에, 지금의 작업을 제약하지 않는 결정은 [역사 색인](../archived/operational-decisions-index-historical.md)에 있다. 공용·영역·역사 색인은 보관 원문의 DEC 를 겹치지 않게 나눠 가지며, 누락·중복과 상태·시행일·supersedes 일치는 Atlas 생성기가 검사한다. 행은 2026-10-24 공용 결정 인덱스에서 옮긴 그대로다(DEC-OPS-381).

| ID | 상태 | 결정 | 시행일 | supersedes |
|---|---|---|---|---|
| DEC-OPS-005 | accepted | `migration-tool`은 온라인 런타임에 포함하지 않는 독립·선택형 offline ETL이다. | 2026-08-18 | - |
| DEC-OPS-110 | accepted | ADR-0008의 소스 adapter 열거(6종)를 CUBRID를 포함한 7종으로 보완한다. | 2026-09-22 | ADR-0008 §1·§6의 6종 열거 부분 |
| DEC-OPS-124 | accepted | ADR-0024 2단계를 적용하고 범위를 온라인 앱으로 한정한다. | 2026-09-24 | ADR-0024 결정 3의 "본체·테스트의 Jackson 2 사용을 걷는다" 범위(migration-tool 제외) |
| DEC-OPS-305 | accepted | 레거시 표준화 이관 설계를 ADR-0029 로 채택하고 결정 대기 Q1~Q10 을 닫는다. | 2026-10-13 | - |
| DEC-OPS-306 | accepted | 이관 도구의 표준 ID 를 온라인 형식과 맞추고, 원본 키를 쓴 시퀀스를 적재 계약 안에서 맞춘다(레거시 표준화 L1 D5). | 2026-10-13 | - |
| DEC-OPS-307 | accepted | 이관 도구가 live 대상 계약과 표준 사전으로 매핑을 검증한다(ADR-0029 L1, D1). | 2026-10-13 | - |
| DEC-OPS-308 | accepted | 온라인 앱이 암호화하는 컬럼은 이관 도구가 같은 암호문으로 쓰고, 평문·키 부재는 쓰기 전에 막는다(레거시 표준화 L1 A1). | 2026-10-13 | - |
| DEC-OPS-309 | accepted | 이관 행 변환 실패를 chunk 단위 fail-closed 로 바꾸고 codemap·date 의미를 엄격히 한다(레거시 표준화 L1 PR-D, Q6 위임 중 행 변환 실패). | 2026-10-13 | - |
| DEC-OPS-310 | accepted | 이관 쓰기 단계 실패도 chunk 단위 fail-closed 로 바꾼다(GAP-ETL-001 종료, 2026-10-14 사용자 승인). | 2026-10-14 | ADR-0029 결정 8의 '쓰기 단계 fail-closed 는 L3 의 예외 행 격리와 함께 한다' 부분 |
| DEC-OPS-311 | accepted | 수집 명령 `profile`·`app-scan` 을 둔다(ADR-0029 L2a). | 2026-10-14 | - |
| DEC-OPS-312 | accepted | 용어 매핑 원장과 표준 메타 확장을 둔다(ADR-0029 L2b-1). | 2026-10-14 | ADR-0029 결정 3 의 "아니면 validate 가 실패한다" 의 시행 시점(L3 전에는 원장을 선언한 mapping 에만) |
| DEC-OPS-313 | accepted | 규칙 기반 용어 후보 `term-suggest` 를 둔다(ADR-0029 L2b-2). | 2026-10-14 | DEC-OPS-305 ① 의 Q3 가드 시행 시점(L2 → LLM 경로를 두는 단계) |
| DEC-OPS-315 | accepted | 표준 도메인 변환기와 규칙 정제 `nullify` 를 둔다(ADR-0029 L3a-1). | 2026-10-15 | DEC-OPS-307 의 DATE→TIMESTAMP 허용과 timestamptz→timestamp·timetz→time 그대로 옮기기 허용 |
| DEC-OPS-316 | accepted | 용어 매핑 원장을 형식 2로 올리고 원장에서 mapping 을 만든다(ADR-0029 L3a-2). | 2026-10-15 | DEC-OPS-313 의 `custom:*` 힌트 어휘, DEC-OPS-312 ③ 의 "확정은 적합률 100 또는 승인 예외", ADR-0029 결정 3 의 같은 확정 조건(적합률은 참고값, unmeasured 와 사유로 확정) |
| DEC-OPS-317 | accepted | plan·load 는 원장을 선언한 mapping 만 받는다(ADR-0029 L3a-2). | 2026-10-15 | DEC-OPS-312 의 원장 없는 mapping 의 plan·load(필수화 유보)와 ③ 의 "대상 컬럼 = 표준 영문약어" 가운데 비표준 대상, ADR-0029 결정 3 의 비표준 대상 부분과 U3 의 허용값 미확인 확정, DEC-OPS-315 ④ 의 프로젝트 변환기 경로, DEC-OPS-307 의 "줄이는 변환은 내장이 아닌 변환기로 선언" |
| DEC-OPS-318 | accepted | 원장이 승인한 위반으로만 실패한 행을 격리하고 값 한계 가드를 둔다(ADR-0029 L3b). | 2026-10-15 | DEC-OPS-309 의 "모든 행 변환 실패는 fail-closed" 가운데 원장 승인 행, DEC-OPS-307 의 문자 소스→decimal·numeric 정적 정밀도 오류(행 가드로 옮김) |
| DEC-OPS-319 | accepted | 한 소스 표를 여러 대상으로 나누고 checkpoint 를 매핑 단위로 기록한다(ADR-0029 L3c). | 2026-10-15 | DEC-OPS-316 ④ 의 "기본이 아닌 mapping 거부", DEC-OPS-315 ⑥ 의 "PR 6개" |
| DEC-OPS-320 | accepted | 매핑이 다른 소스 표를 단일 키로 조회해 그 컬럼을 옮긴다(ADR-0029 L3d). | 2026-10-15 | DEC-OPS-316 ④ 의 "via 거부", DEC-OPS-318 ⑥ 의 "형식 2"·DEC-OPS-321 ④ 의 "형식 3", DEC-OPS-321 ① 의 조회만 하는 표의 EXPORT_ONLY |
| DEC-OPS-321 | accepted | 보관 덤프를 COMMIT load 와 같은 원천 읽기 세션에서 쓰고 격리 행의 키를 반출한다(ADR-0029 L3e). | 2026-10-15 | - |
| DEC-OPS-322 | accepted | isolate 가 `LENGTH_EXCEEDED`·`PRECISION_EXCEEDED` 를 승인한 컬럼은 선언 길이·자릿수 정적 판정을 행 가드로 옮긴다(ADR-0029 L3e, 위임 결정). | 2026-10-15 | DEC-OPS-307 의 선언 길이·자릿수 정적 판정 가운데 그 코드를 승인한 isolate 컬럼, DEC-OPS-318 ④ 의 '선언 길이·자릿수의 정적 판정은 isolate 컬럼에도 그대로다(…미결)' 가운데 그 코드를 승인한 컬럼 |
| DEC-OPS-323 | accepted | Oracle Free 원천으로 표준화 이관을 리허설하고 드러난 결함 셋을 고친다(ADR-0029 L4-B). | 2026-10-15 | ADR-0029 실행 규칙 "각 단계는 앞 단계가 병합된 뒤 시작한다" 가운데 L4 착수 시점, DEC-OPS-311 이유의 "REMARKS 를 주지 않으면 INVENTORY_ONLY" 가운데 Oracle |
| DEC-OPS-324 | accepted | load 는 적재 뒤 대사를 지나야 PASS 다(ADR-0029 L4 D2). | 2026-10-15 | - |
| DEC-OPS-325 | accepted | 공통코드를 쓰기 전과 적재 뒤에 대조한다(ADR-0029 L4 D7). | 2026-10-15 | DEC-OPS-317 ③ 의 '허용값 대사는 L4 가 맡는다' 가운데 대조 원천이 없는 컬럼(사람 확인·서명으로 바뀐다)과, ②·③ 가운데 VALIDATE 바인딩 컬럼의 codemap 없는 확정 |
| DEC-OPS-326 | accepted | 원천 사용자 이름이 원천 schema 이름과 같으면 credential 검사에서 사용자 이름으로 보지 않는다(GAP-MIG-001 의 결정 필요 항목). | 2026-10-16 | - |
