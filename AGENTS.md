# AGENTS.md — eGov Enterprise 공통 에이전트 계약

이 파일은 이 저장소에서 일하는 **모든 AI 에이전트의 vendor-neutral 프로젝트 규칙 SSOT**다.
Gemini·Claude Code·Codex 등은 같은 워킹트리를 공유하며, 도구별 진입점은 이 규칙을 다시 쓰지 않고 연결만 한다.

## 규칙 계층과 단일 원본

1. 플랫폼·시스템 정책과 각 도구의 글로벌 규칙
2. 이 파일 `AGENTS.md` — 프로젝트 공통 행동·안전 규칙
3. [오케스트레이션 프로토콜](docs/03-guides/orchestration-protocol.md) — 작업 등급·승인·실행 단계 SSOT
4. 관련 코드 헌법 — 도메인별 구현 규범
   - [백엔드 헌법](.agent/knowledge/backend-api-constitution/artifacts/constitution.md)
   - [프론트엔드 헌법](.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md)
   - [DB 헌법](.agent/knowledge/db-standard-constitution/artifacts/constitution.md)
5. Accepted ADR, 현재 코드·설정·DB 실측 — 결정과 현재 상태의 증거
6. [.agent/memory](.agent/memory/) — 위 원본을 요약한 비규범 파생 인덱스

상위 규칙과 충돌하면 상위 규칙을 따른다. 글로벌 규칙은 저장소에 복사하지 않는다. 모든 에이전트에 공통이어야 하는 규칙만 이 파일에 둔다. 3대 헌법과 이 파일의 실질 정책 변경은 사용자의 명시적 요청 없이 하지 않는다.

## 작업 시작 시 필수 읽기

1. 현재 디스크의 `git status`와 대상 파일을 직접 확인한다. 과거 세션의 상태를 가정하지 않는다.
2. 다음 공용 메모리 3개를 읽고, 사실은 링크된 원본에서 재확인한다.
   - [project-context.md](.agent/memory/project-context.md)
   - [decisions.md](.agent/memory/decisions.md)
   - [known-gaps.md](.agent/memory/known-gaps.md)
3. 변경 작업은 오케스트레이션 프로토콜에서 등급과 승인 경계를 확인하고, 관련 헌법·KI·스킬만 읽는다.
4. 스킬 지시가 헌법·이 파일·현재 코드와 충돌하거나 낡았으면 상위 원본을 따르고 충돌을 보고한다.

## 공통 작업 원칙

- 먼저 요구사항·영향 범위·현재 구현을 확인하고, 가장 작은 안전한 변경을 한다.
- 요청 밖의 코드·포맷·사용자 변경분을 보존한다. 대량 치환은 호출부별 의미가 같다는 증거가 있을 때만 한다.
- 완료 선언은 실행 로그·테스트·실측 근거가 있을 때만 한다. 실행하지 않은 검증은 실행했다고 표현하지 않는다.
- 실패가 나면 증상을 덮지 말고 원인 가설 → 표적 증거 → 최소 수정 → 재검증 순으로 진행한다. 같은 원인으로 세 번 실패하면 중단하고 증거와 선택지를 보고한다.
- DB 문제는 실제 스키마·데이터 상태를, E2E 문제는 DOM·trace·screenshot과 백엔드/JVM 로그를 서로 대조한 뒤 원인을 판정한다.
- 비밀·토큰·쿠키·개인정보·개인키·원시 세션 로그를 코드, 문서, 공용 메모리에 기록하지 않는다.
- 대량 삭제, 운영/코어 데이터 DML, DB 스키마·인프라 변경, 외부 발행·전송, 강제 푸시는 사전 설명과 사용자 승인이 필요하다.
- `db-bridge`의 허용된 읽기 SQL(`SELECT`·`WITH`·`SHOW`·read-only `EXPLAIN`·`VALUES`)은 진단 목적으로 자율 실행할 수 있다. 쓰기 우회는 금지한다.

## Evidence guardrails

- **H1 — 물리 스키마 우선**: Entity·DDL·PK 전략 변경 전 live `information_schema`와 메타 표준을 조회한다. H2/create-drop 테스트나 컴파일 성공은 운영 스키마 정합 증거가 아니다.
- **H2 — 신호 은폐 금지**: 동결 baseline을 비우거나 예외·제외 목록을 늘려 red를 없애지 않는다. 정당한 변경은 실제 위반 수정, 사유, manifest 갱신을 같은 변경에 포함한다.
- **H3 — 인가 의미 보존**: owner-only, owner-or-admin, admin-only 등 도메인 의미를 먼저 판정한다. 헬퍼 이름 통일을 이유로 권한을 완화하거나 프라이버시를 깨지 않는다.
- **H4 — 기계적 sweep 금지**: 같은 문법이 같은 의미임을 뜻하지 않는다. 변경 대상별 근거와 예외를 먼저 식별한다.
- **H5 — 실행 경로와 red 증명**: 게이트를 신설·수정하면 로컬/CI 실행 경로를 연결하고, 의도적 위반이 red가 되는 부정 테스트까지 확인한다.

## Verification by change scope

검증은 변경 위험과 범위에 비례해야 한다. 문서 한 장 때문에 전 스택을 빌드하지 않으며, 소스 변경을 문서 fast-pass로 숨기지도 않는다.

| 변경 범위 | 최소 검증 |
|---|---|
| 문서·공용 메모리·정적 HTML만 | 관련 문서/메모리/HTML 계약 테스트와 링크 검사 |
| 백엔드 소스 | 영향 테스트 + `./gradlew compileJava compileTestJava` |
| 프론트엔드 소스 | 영향 테스트 + `pnpm -C frontend exec tsc --noEmit` 및 관련 lint/build |
| API/DB/양단 계약 | 백엔드·프론트 계약 생성물과 양쪽 검증 |
| 게이트·CI·훅 | 해당 계약 테스트 + 의도적 위반 red 증명 |

로컬 훅은 빠른 피드백이며 `--no-verify`로 우회 가능하다. 병합 권위는 required CI다. 더 넓은 검증이 필요하면 `npm run verify`, 운영 ruleset은 `npm run verify:ops`를 사용한다.

## 공유 워킹트리와 Git

- 수정 전후 `git status`와 대상 diff를 확인하고 다른 에이전트·사용자의 WIP를 덮어쓰지 않는다.
- 커밋 요청 시 자기 변경만 `git commit --only -- <paths>`로 포함한다. 커밋·푸시·머지는 사용자가 요청한 범위에서만 수행한다.
- 규칙·게이트 변경은 관련 문서와 회귀 방지 계약을 같은 변경 세트로 갱신한다.

## Documentation and memory

- 새 일반 문서는 `docs/01-product`, `02-architecture`, `03-guides`, `04-operations`, `archived` 중 하나에 kebab-case로 두고 [문서 인덱스](docs/README.md)를 갱신한다.
- `.agent/memory/`는 공용 운영 메모리만을 위한 예외 경로이며 규범 SSOT가 아니다.
- 지속 가능한 프로젝트 사실은 `project-context.md`, 사용자 승인 결정은 ADR 후 `decisions.md`, 재현 가능한 미해결 위험은 `known-gaps.md`에 링크와 검증일을 남긴다.
- 진행률·세션 TODO·추측·원시 로그는 공용 메모리에 넣지 않는다. `.gemini/tasks/`에는 새 세션 저널을 만들지 않으며 기존 census·archive 지원 자산도 현재 상태 원장이 아니다.
- 공용 메모리는 실시간 락·presence·작업 claim 버스가 아니다. 동시 작업 조정은 현재 디스크와 별도 조정 메커니즘으로 한다.

## 도구별 진입점

| 도구 | 자동 진입점 | 역할 |
|---|---|---|
| Codex 및 AGENTS 지원 도구 | `AGENTS.md` | 이 파일을 직접 상속 |
| Antigravity/Gemini | [GEMINI.md](GEMINI.md) | 글로벌 Gemini 규칙 + 이 파일·공용 메모리 연결 |
| Claude Code | [CLAUDE.md](CLAUDE.md) | 이 파일·공용 메모리 연결 + Claude 실행 어댑터 |
| 그 밖의 도구 | `AGENTS.md`를 명시 로드 | 별도 정책 복제 없이 동일 계약 적용 |
