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
5. Accepted ADR, 승인된 운영 결정(DEC, 전문 정본은 보관 원문의 같은 ID 절), 현재 코드·설정·DB 실측 — 결정과 현재 상태의 증거
6. [.agent/memory](.agent/memory/) — 위 원본을 요약한 비규범 파생 인덱스

상위 규칙과 충돌하면 상위 규칙을 따른다. 글로벌 규칙은 저장소에 복사하지 않는다. 모든 에이전트에 공통이어야 하는 규칙만 이 파일에 둔다. 3대 헌법과 이 파일의 실질 정책 변경은 사용자의 명시적 요청 없이 하지 않는다.

## 작업 시작 시 필수 읽기

1. 현재 디스크의 `git status`와 대상 파일을 직접 확인한다. 과거 세션의 상태를 가정하지 않는다.
2. 다음 공용 메모리 3개를 읽고, 사실은 링크된 원본에서 재확인한다.
   - [project-context.md](.agent/memory/project-context.md)
   - [decisions.md](.agent/memory/decisions.md)
   - [known-gaps.md](.agent/memory/known-gaps.md)
3. 변경 작업은 오케스트레이션 프로토콜에서 등급과 승인 경계를 확인하고, 관련 헌법·KI·스킬과 [decisions.md](.agent/memory/decisions.md) 「영역 결정 색인」 표에서 대상 경로가 걸리는 영역 결정 색인과 [gap 영역 상세](docs/04-operations/known-gaps-detail.md)의 같은 영역 절만 읽는다. 대상 경로는 작업이 직접 고치는 입력 파일이다(생성물·공용 메모리·결정 색인 제외 — 그 변경을 부른 입력 경로로 판정한다). 걸리는 색인은 `node scripts/decision-indexes.mjs --for <경로…>`(또는 `--diff <base>`)가 그 표와 같은 원장으로 출력한다. 어느 원장에도 걸리지 않거나 걸리는지 판단이 서지 않으면 그 표의 색인을 모두 읽는다. Accepted ADR 은 [decisions.md](.agent/memory/decisions.md)의 영역별 ID·제목 목록에서 작업과 닿는 것을 영역과 상관없이 읽는다.
4. 스킬 지시가 헌법·이 파일·현재 코드와 충돌하거나 낡았으면 상위 원본을 따르고 충돌을 보고한다.

## 공통 작업 원칙

- 먼저 요구사항·영향 범위·현재 구현을 확인하고, 가장 작은 안전한 변경을 한다.
- 요청 밖의 코드·포맷·사용자 변경분을 보존한다. 대량 치환은 호출부별 의미가 같다는 증거가 있을 때만 한다.
- 완료 선언은 실행 로그·테스트·실측 근거가 있을 때만 한다. 실행하지 않은 검증은 실행했다고 표현하지 않는다.
- 실패가 나면 증상을 덮지 말고 원인 가설 → 표적 증거 → 최소 수정 → 재검증 순으로 진행한다. 같은 원인으로 세 번 실패하면 중단하고 증거와 선택지를 보고한다.
- DB 문제는 실제 스키마·데이터 상태를, E2E 문제는 DOM·trace·screenshot과 백엔드/JVM 로그를 서로 대조한 뒤 원인을 판정한다.
- 비밀·토큰·쿠키·개인정보·개인키·원시 세션 로그를 코드, 문서, 공용 메모리에 기록하지 않는다.
- 대량 삭제, 운영/코어 데이터 DML, DB 스키마·인프라 변경, 외부 발행·전송, 강제 푸시는 사전 설명과 사용자 승인이 필요하다.
- 예외: 의미를 바꾸는 변경의 독립 검토를 이 기계에 설치된 CLI 로 메인 에이전트와 다른 회사의 모델에 맡길 때 이 저장소의 diff 와 사용자 원문 요청을 보내는 것은 매번 묻지 않는다(DEC-OPS-386 ⑥, DEC-OPS-387). 비밀·토큰·쿠키·개인정보·운영 데이터·`.env` 내용은 보내지 않으며, 원문에 그런 내용이 있으면 빼거나 먼저 묻는다.
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

로컬 훅은 빠른 피드백이며 `--no-verify`로 우회 가능하다 — 에이전트는 사용자가 명시적으로 지시한 경우에만 우회한다([§6.2](docs/03-guides/orchestration-protocol.md#62-검증은-한-커밋에-한-번)). 병합 권위는 required CI다. 더 넓은 검증이 필요하면 `npm run verify`, 운영 ruleset은 `npm run verify:ops`를 사용한다. pre-push 가 같은 커밋에서 실행한 항목은 위 최소 검증을 충족한 것으로 보며, push 직전에 고를 넓은 검증은 [연속 작업의 시간 예산](#연속-작업의-시간-예산)을 따른다([§6.2](docs/03-guides/orchestration-protocol.md#62-검증은-한-커밋에-한-번)).

## 거버넌스 총량 관리

게이트와 기록은 신호를 지키기 위한 비용이다. 비용이 신호보다 빨리 늘지 않게 한다.

- 새 게이트·계약·census를 만들기 전에 같은 불변식을 이미 보는 게이트([gate registry](config/governance/gates.json), `scripts/*.test.mjs`, 하네스)를 찾는다. 기존 게이트를 확장해 해결되면 확장한다. 새로 만들면 확장할 수 없는 이유를 변경 설명에 남긴다.
- 변경 후 두 게이트가 같은 불변식을 검사하면 같은 변경에서 하나로 합치거나 약한 쪽을 걷는다. 걷은 뒤 남은 게이트로 red 증명을 다시 확인한다. 적용 범위가 줄지 않는 중복 제거는 H2의 신호 은폐가 아니다.
- 공용 메모리와 결정 색인의 행에는 결론·근거 링크·다음 행동만 적는다. 경위·실측 로그·red 증명 상세는 커밋·PR·링크 문서에 둔다. 행 길이와 자동 로드 파일의 전체 크기 상한은 [공용 메모리 계약](scripts/shared-memory-contract.test.mjs)이 검사한다. 상한에 닿으면 행을 줄이거나 기준상 더는 늘 걸리지 않게 된 행만 옮긴다. 늘 걸리는 행을 크기 때문에 옮기거나 상한을 올리는 것은 H2 판단이다.

## 연속 작업의 시간 예산

반복 비용만 줄이고 신호와 권한 범위는 그대로 둔다. 이 절을 훅 우회나 범위별 최소 검증·위임 산출물 재검증·H1~H5·red 증명 생략의 근거로 쓰지 않는다. 절차는 [오케스트레이션 프로토콜 §6](docs/03-guides/orchestration-protocol.md#6-연속-배치-작업의-시간-예산-batch-time-budget)을 따른다.

- 연속 배치는 PR 수를 줄인다. 응집된 배치 하나를 PR 하나로 묶거나, 한 브랜치에 쌓아 required CI 한 번으로 병합한다.
- 같은 커밋에 같은 검증 묶음을 되풀이하지 않는다. 넓은 로컬 검증은 푸시 직전에 한 번, 훅이 보지 않는 검사만 고르며, 병합 판정은 required CI가 한다.
- 무거운 검증([§6.3](docs/03-guides/orchestration-protocol.md#63-무거운-검증은-하나씩)의 목록)은 한 기계에서 하나씩 실행한다. 겹쳐 실행한 결과는 red든 green이든 증거로 쓰지 않는다.
- main 최신화 뒤 생성물(생성 계약, census, 승인 해시, Atlas)은 손으로 병합하지 않고 생성기로 다시 만든다. 공용 메모리 표는 양쪽 행을 살려 합치고 수치는 원장에서 다시 센다.

## 공유 워킹트리와 Git

- 수정 전후 `git status`와 대상 diff를 확인하고 다른 에이전트·사용자의 WIP를 덮어쓰지 않는다. 다른 오퍼레이터(다른 에이전트 세션·사용자)가 같은 워킹트리에서 동시에 작업하고 있으면 별도 작업 트리에서 작업한다([SOP §6.6](docs/03-guides/orchestration-protocol.md#66-작업-트리)).
- 커밋 요청 시 자기 변경만 `git commit --only -- <paths>`로 포함한다. 그 경로에 다른 작업의 변경이 섞여 있으면 `--only`도 파일 전체를 담으므로 커밋하지 않고 멈춰 섞인 경로와 선택지를 보고한다. 커밋·푸시·머지는 사용자가 요청한 범위에서만 수행한다. 사용자가 맡긴 변경 작업은 아래 완료 범위까지가 그 요청이다.
- **직접 맡은 작업의 완료 범위(사용자 상시 승인)**: 사용자가 요청해 해당 에이전트가 직접 수행한 작업 브랜치는 자기 변경 커밋·푸시 → PR 작성 → 최신 커밋의 required CI 통과 → PR을 통한 main 병합 → 병합 반영 확인 후 해당 원격·로컬 작업 브랜치 삭제까지 추가 승인 없이 진행한다. 사용자의 현재 지시가 `로컬 작업만`, `PR만 작성`, `병합 보류`, `브랜치 유지` 등으로 범위를 제한하면 그 지시가 우선한다.
- **다른 작업 보호**: 위 승인은 다른 에이전트·사용자의 브랜치나 WIP를 임의로 통합·수정·삭제하는 권한이 아니다. 브랜치 이름·접두사·현재 checkout·일부 파일 수정만으로 브랜치 전체를 자기 작업이라고 판단하지 않는다. 삭제 전 병합된 PR HEAD와 삭제 대상의 일치·현재 로컬 및 원격 HEAD·worktree 사용 여부를 확인하고, 병합되지 않은 추가 커밋이나 다른 작업의 변경분이 있으면 보존한다. 작업 브랜치 삭제와 worktree 디렉터리 삭제는 별개이며, 디렉터리와 그 안의 미추적 산출물을 자동 삭제하지 않는다.
- 규칙·게이트 변경은 관련 문서와 회귀 방지 계약을 같은 변경 세트로 갱신한다.

## Documentation and memory

- 새 일반 문서는 `docs/01-product`, `02-architecture`, `03-guides`, `04-operations`, `archived` 중 하나에 kebab-case로 두고 [문서 인덱스](docs/README.md)를 갱신한다.
- `.agent/memory/`는 공용 운영 메모리만을 위한 예외 경로이며 규범 SSOT가 아니다.
- 지속 가능한 프로젝트 사실은 `project-context.md`, 사용자 승인 결정은 ADR 후 결정 색인(`decisions.md`와 그 「영역 결정 색인」 표가 가리키는 색인), 재현 가능한 미해결 위험은 `known-gaps.md`에 링크와 검증일을 남긴다 — 모든 작업에 걸리거나 글로만 지켜지고 어기면 검증 신호·인가·데이터·식별자를 해치는 금지가 있는 위험만 전문을 두고, 특정 경로에서만 필요한 위험은 그 레지스트리에 한 줄을 두며 전문을 [gap 영역 상세](docs/04-operations/known-gaps-detail.md)의 영역 절에 둔다.
- 운영 결정(DEC)은 앞으로의 작업을 제약하는 규칙·경계이거나 사용자 승인(정책·데이터·외부 반영)일 때만 쓰고, 한 번의 사용자 결정으로 진행한 배치는 DEC 하나로 쓴다. 새 DEC 행은 그 결정이 걸리는 경로의 영역 결정 색인에 쓰고, 모든 변경에 걸리는 작업·기록·승인 절차이거나 시험·계약이 막지 못해 글로만 지켜지고 어기면 검증 신호·인가·데이터·식별자를 해치는 경계일 때만 자동 로드되는 `decisions.md` 운영 결정 표에 쓴다. 구현 기록·고정값 변경·커버리지 상향·리팩터링은 PR·커밋 설명에 둔다. 공유 OCI DB 마이그레이션 적용의 승인과 결과는 DEC 대신 [적용 로그](docs/04-operations/shared-oci-migration-apply-log.md)에 남긴다.
- 진행률·세션 TODO·추측·원시 로그는 공용 메모리에 넣지 않는다. 도구별 세션 저널도 저장소에 만들지 않는다.
- 공용 메모리는 실시간 락·presence·작업 claim 버스가 아니다. 동시 작업 조정은 현재 디스크와 별도 조정 메커니즘으로 한다.

## 도구별 진입점

| 도구 | 자동 진입점 | 스킬 안내 | 실행 전 가드 | 역할 |
|---|---|---|---|---|
| Codex 및 AGENTS 지원 도구 | `AGENTS.md` | `.agents/skills/` | `.codex/hooks.json`(`/hooks` 에서 신뢰해야 돈다. Windows 는 사용자 설정의 프로젝트 신뢰 경로가 드라이브 대소문자까지 맞아야 이 파일을 읽는다) | 이 파일을 직접 상속 |
| Antigravity/Gemini | [GEMINI.md](GEMINI.md)·`AGENTS.md` | `.agents/skills/` | `.agents/hooks.json` | 글로벌 Gemini 규칙 + 이 파일·공용 메모리 연결 |
| Claude Code | [CLAUDE.md](CLAUDE.md) | `.claude/skills/` | `.claude/settings.json` | 이 파일·공용 메모리 연결 + Claude 실행 어댑터 |
| 그 밖의 도구 | `AGENTS.md`를 명시 로드 | `.agent/skills/` 를 직접 읽는다 | 없음 — git 훅·required CI 가 받친다 | 별도 정책 복제 없이 동일 계약 적용 |

- 스킬 정본은 `.agent/skills/` 하나다. 도구별 안내 파일은 [생성기](scripts/agent-skill-adapters.mjs)가 `npm run regen` 으로 만들므로 직접 고치지 않는다.
- 실행 전 가드의 규칙·근거·대신 쓸 방법은 [agent-guard](scripts/agent-guard.mjs)의 규칙 표가 정본이고, 세 어댑터는 그것을 부르기만 한다. 반복된 실수는 기억·문서보다 먼저 가드·lint·계약으로 막고, 새 규칙은 실제 사례가 붉어지는 시험과 함께 둔다. 가드는 앞단의 보조이며 병합 권위는 required CI 다. 가드는 판정하지 못하면 조용히 통과하므로, 세션을 시작하거나 어댑터를 바꾼 뒤 `echo AGENT_GUARD_CANARY` 를 한 번 실행해 막히는지 본다 — 막히지 않으면 그 도구의 어댑터가 끊긴 것이다.
