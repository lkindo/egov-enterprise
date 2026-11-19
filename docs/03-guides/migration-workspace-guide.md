# 로컬 이관 작업공간 실행 안내

이 도구는 온라인 업무 앱과 별도 URL에서 기존 Java 이관 CLI를 실행한다. 제품 결정은 [ADR-0041](../02-architecture/decisions/ADR-0041-local-migration-workspace-and-ai.md), 화면 예시는 [설계서](../01-product/migration-workspace-design.md)에 있다.

## 시작

Node.js 22와 Java 21이 필요하다. 저장소 루트에서 기존 이관 JAR를 만든 뒤 로컬 실행기를 시작한다. 작업공간은 Git 밖의 사용자 전용 디렉터리를 지정한다.

```powershell
./gradlew :migration-tool:bootJar
npm run migration:ui -- --workspace D:/migration-workspaces/project-a
```

실행기는 시작할 때마다 이번 실행의 접속 열쇠(실행 비밀)를 새로 만들고 터미널에 `http://127.0.0.1:8770/#launch=<실행 비밀>` 주소를 출력한다. 이 주소를 `#launch=` 부분까지 그대로 브라우저에서 연다. 실행기는 브라우저를 자동으로 열지 않는다. Java가 PATH에 없으면 `--java <java.exe 전체 경로>`, 포트를 바꾸려면 `--port 8771`을 추가한다. `--git`은 확정 원장 검증에 사용할 Git 실행 파일이다. 실행기 종료 후 DB 비밀번호와 API key는 다시 입력한다. 실행 중인 작업이 있으면 정상 종료를 거부한다. 브라우저를 닫아도 실행기 프로세스가 살아 있으면 작업은 계속된다.

실행 비밀은 주소의 조각(`#` 뒤)에만 실린다. 조각은 서버로 전송되지 않아 요청 기록·Referer에 남지 않고, 실행기도 비밀을 파일·작업 색인·로그에 쓰지 않는다. 이 주소는 다른 사람과 공유하거나 문서·채팅에 붙이지 않는다. 화면은 조각의 비밀을 그 탭의 세션 저장소(포트별)에 옮기고 주소창에서 바로 지운 뒤 `X-Migration-Workspace-Launch` 헤더로만 보낸다.

- 같은 탭은 새로고침해도 연결이 유지된다. 새 탭이나 북마크처럼 조각 없이 연 화면은 연결되지 않으므로 터미널에 표시된 주소를 다시 연다.
- 실행기를 다시 시작하면 비밀이 바뀐다. 이전 탭은 `LAUNCH_REQUIRED`와 터미널에 표시된 주소로 다시 열라는 안내를 표시하므로, 터미널의 새 주소로 다시 연다.
- 실행기는 비밀을 상수 시간으로 비교하며 헤더가 없거나 틀리거나 중복되면 `403 LAUNCH_REQUIRED`로 요청 토큰을 주지 않는다. 쿼리 문자열로 보낸 비밀은 받지 않는다. 그래서 같은 PC의 다른 OS 계정이나 브라우저 밖 로컬 프로그램은 loopback에 닿아도 요청 토큰을 받지 못한다. Host·Origin·Sec-Fetch·요청 토큰 검사는 그대로다.

프로토타입은 `node tools/migration-workspace-prototype/serve.mjs`로 8769에서 열며 실제 연결과 적재를 하지 않는다. 두 화면은 별개다. 프로토타입이 Windows에서 브라우저를 자동으로 열 때는 `%SystemRoot%\System32\rundll32.exe` 전체 경로를 쓰고(`SystemRoot`가 없거나 로컬 절대 경로가 아니면 `C:\Windows`), 그 파일이 링크가 아닌 일반 파일일 때만 실행한다. 아니면 주소를 직접 열라고 안내한다. `--no-open`으로 자동 열기를 끈다.

## 실제 작업 순서

1. **연결:** 원천과 대상 프로필을 저장한다. 대상은 PostgreSQL이다. 원천 PostgreSQL 외의 DB는 맞는 JDBC JAR가 필요하고 현재 driver 검증 자격을 유지한다. Oracle service/SID를 지원하며 TNS, SSH 터널 자동 설정, Wallet·통합 인증은 아직 지원하지 않는다. 복잡한 접속은 기관에서 마련한 로컬 네트워크 경로를 먼저 준비한다.
2. **입력:** 소스 폴더를 등록하거나 ZIP 목록을 확인한 뒤 로컬 해제를 선택한다. 설정/키·의존성·빌드 산출물 제외와 실제 분석 범위는 결과에서 확인한다. DDL은 UTF-8 테이블·PK/FK·코멘트 초안용이며 미지원 문장 번호를 보고한다. DDL을 실행하거나 live inventory로 취급하지 않는다. 입력 준비(업로드·폴더·ZIP·DDL·가져오기)는 한 번에 하나다. 준비 중에 다른 업로드를 보내면 실행기가 본문을 받지 않고 바로 `INPUT_BUSY`로 거부하므로, 앞선 준비가 끝난 뒤 다시 보낸다.
3. **분석:** 구조 조사→품질 분석→소스 근거→표준 후보를 실행한다. 데이터 접속과 실제 산출물이 있어야 성공한다. JAR·계정·권한·표준 자료가 없으면 오류를 표시한다. 원시 CLI 로그는 화면이나 작업 색인에 저장하지 않는다.
4. **검토:** 후보 생성에서 만든 형식 2 JSON 초안을 용어 표에서 검토·저장하거나 기존 JSON 원장을 가져온다. CLI의 `--ledger-draft` 출력 경로가 `.json`이면 JSON을 쓰고 기존 YAML 출력은 유지한다([이관 도구 설계](../02-architecture/legacy-migration-tool-design.md#용어-후보adr-0029-l2b-2)). UI의 임의 YAML 입력·편집은 지원하지 않는다. YAML로 확정한 기관 원장은 작업공간이 가져오지 못하므로 CLI 경로(`mapping-generate --ledger`)로 쓰거나, 같은 내용을 JSON 형식 2로 다시 검토·commit한 뒤 가져온다. 원장·skeleton·review는 기존 CLI 형식을 사용한다. 매핑 생성 전 **표준 컬럼 스냅샷**도 가져온다. 형식은 `[{"table_name":"public.tb_example","column_name":"EXAMPLE_ID"}]`이며 기존 CLI가 사용하는 실제 대상 이름과 일치해야 한다. 변경하면 기존 매핑·계획의 실행 준비가 무효화된다. 확정 원장은 기관 Git에서 검토·commit한 파일 경로로 가져온다. tracked 파일·index·HEAD blob·현재 바이트가 같아야 한다. 이 검사는 기관의 검토 승인을 대신하지 않는다.
5. **실행:** 매핑 생성→계획→검증→리허설을 지나 동일 입력 판으로 실제 적재한다. adapter·driver·원천 동결·대상 확인과 기존 review/plan 검증을 유지한다. 실제 적재의 안전 일시정지는 지원하지 않는다. 실패 또는 결과 불명은 아래 [결과 불명 작업 확인](#결과-불명-작업-확인)과 [복구 런북](../04-operations/migration-recovery-runbook.md)의 실행 증거·checkpoint·백업으로 대조한다.

구조 조사 실패 시 **작업 진행 기록**의 오류 코드와 해결 방법을 확인한다. 실행기는 CLI가 실패 문구 끝에 붙이는 고정 진단 코드(`MW_DIAGNOSTIC`)만 읽으며, 코드 목록과 판정 근거는 [이관 도구 설계](../02-architecture/legacy-migration-tool-design.md#실패-출력과-진단-코드)가 정본이다. PostgreSQL 원천·대상에서는 TLS 미지원·인증서 검증·계정 인증·DB 없음·권한·접속 거부·시간 초과·호스트 없음·드라이버 오류를 구분하며, 연결 설정 버튼으로 관련 항목을 연다. 외부 driver를 쓰는 원천(PostgreSQL 외)도 driver 격리 경계 안에서 같은 규칙으로 분류한다. 다만 인증 실패는 SQLState 28 클래스, 권한 거부는 `42501`, TLS 미지원은 PostgreSQL JDBC 문구로만 판정하므로 Oracle·SQL Server의 인증 실패처럼 다른 상태 코드를 쓰는 driver의 오류는 `CLI_FAILED`로 남을 수 있다. 기본 TLS 모드는 인증서와 호스트를 검증한다. TLS를 제공하지 않는 로컬 DB는 그 설정으로 접속할 수 없으며, 사용자가 해당 연결에서 TLS 사용 여부를 결정해야 한다. 도구가 TLS를 자동 해제하지 않는다. Windows PostgreSQL JDBC의 기본 CA 경로는 `%APPDATA%/postgresql/root.crt`이며 실행기에 이 환경 경로를 전달한다. 원문 오류·비밀번호·접속값은 오류 기록에 남기지 않는다. 이전 실행 기록이나 분류하지 못한 오류는 `CLI_FAILED`로 남는다.

## 준비 상태와 반복 작업

단계별 실행 버튼은 현재 연결·세션 비밀번호·입력 자료·산출물에 따라 준비 여부와 부족한 항목을 표시한다. 이전에 성공한 기록만으로 현재 단계가 준비됐다고 판단하지 않는다. 원천 조사에는 원천 연결이, 소스 분석에는 소스 폴더가, 표준 후보에는 품질 분석 결과와 대상 연결이 필요하다. 버튼 활성화는 실제 DB 접속·파일 무결성·실행 승인을 통과했다는 뜻이 아니며 실행기가 다시 확인한다.

대상 연결을 바꾸면 대상에 의존하는 후보·매핑·계획을 다시 준비하고, 원천 구조·품질·소스 분석 결과는 유지한다. 소스 폴더 변경도 관련 결과만 무효화한다. 분석을 다시 시작하면 해당 결과와 후속 결과는 새 실행의 성공 전까지 사용할 수 없다. 실패·중단된 재실행 대신 예전 결과를 다음 단계에 자동 사용하지 않으며, 사람이 편집한 원장과 기관 Git 확정본은 보존한다.

같은 DB·계정의 스키마나 TLS 설정만 수정할 때는 **현재 세션 비밀번호 유지**를 선택할 수 있다. 접속 대상·계정·드라이버가 달라지면 비밀번호를 다시 입력해야 한다. 새 비밀번호를 입력하면 교체하고, 유지 선택을 해제한 채 비우고 저장하면 세션 비밀번호를 해제한다. 재시작 이후에는 유지할 비밀번호가 없으므로 다시 입력한다. 저장 응답을 기다리는 동안 추가로 작성한 입력과 새 파일 선택은 보존되며, 추가 변경은 별도로 저장한다.

## 결과 불명 작업 확인

리허설(DRY_RUN)과 실제 적재(COMMIT)만 결과 불명(`unknown`)이 될 수 있다. 시작한 COMMIT이 PASS 실행 증거 없이 끝나면(프로세스 실패·증거 수집 실패) 결과 불명이다. 실행기 재시작으로 끊긴 적재는 리허설이어도 결과 불명으로 복구된다. 리허설은 대상 DB와 이관 제어 스키마에 쓰지 않고 작업공간에 실행 증거만 남기므로, 끝까지 실행된 리허설의 실패는 실패(`failed`)다. 예를 들어 비밀번호 오류(`DB_AUTH_FAILED`)로 끝난 리허설은 설정을 고친 뒤 다시 리허설하면 된다.

사람 확인 기록이 없는 결과 불명 작업은 새 리허설·실제 적재만 막는다(단계 준비 조건 `JOB_RESULT_UNKNOWN`). 구조 조사·품질 분석·소스 분석·표준 후보·매핑 생성·계획·검증과 입력 저장(업로드·폴더·ZIP·DDL·가져오기·연결 프로필·원장 초안)은 계속 쓸 수 있다. 이전 실행기의 작업 프로세스가 아직 살아 있거나 종료 여부를 판정할 수 없으면 모든 작업을 막고, 그 작업의 확인 기록도 받지 않는다(`PREVIOUS_PROCESS_ALIVE`). 그때는 그 프로세스의 종료와 산출물을 먼저 확인한다.

확인 절차는 작업 진행 기록의 결과 불명 항목에서 진행한다.

1. **실행 증거 불러오기**를 누른다. 실행기는 그 적재가 만든 실행 증거만 보여준다. 계획 파일 옆 `.load-*.json` 가운데 시작 전에 있던 파일은 빼고, 파일 이름·SHA-256·바이트와 고정 요약(형식, DRY_RUN/COMMIT, STARTED/PASS/FAILED/UNREADABLE, 시작·갱신 시각, 표 수, 기록된 `written` 합)만 싣는다. 행 값·키·경로는 없다. 이 기능 전에 기록된 작업은 증거 위치를 모르므로 작업공간의 증거 파일을 사람이 직접 확인한다. 대조할 증거가 너무 많으면 `EXECUTION_EVIDENCE_AMBIGUOUS`다.
2. 실행 증거의 `STARTED`·최종 상태와 대상 DB의 이관 제어 기록(checkpoint)을 기관 절차와 [복구 런북](../04-operations/migration-recovery-runbook.md)으로 확인한다. 앞서 커밋된 chunk는 되돌아가지 않으며 전체 복구는 기관 백업·복구 계획을 따른다. 실행기는 적재를 자동으로 재개하지 않는다.
3. 확인한 내용을 메모(1~1000자, 제어문자·세션 비밀번호 금지)로 적고 확인란을 고른 뒤 **확인 기록 남기기**를 누른다. 실행 중인 작업이 없고 화면의 작업 판이 최신이어야 한다.

확인 기록(시각·메모·증거 digest)은 작업 기록에 남고 상태는 결과 불명 그대로다. 확인 기록은 성공이나 복구 승인을 뜻하지 않는다. 기록 뒤에는 새 적재 차단이 풀린다. 다만 결과 불명 COMMIT을 확인하면 리허설 통과 기록이 지워지므로, 다음 실제 적재 전에 리허설을 다시 통과해야 한다. 같은 작업을 다시 확인하면 `JOB_ALREADY_ACKNOWLEDGED`, 결과 불명이 아닌 작업은 `JOB_NOT_UNKNOWN`이다. 화면은 `GET /api/jobs/<id>/evidence`와 `POST /api/jobs/<id>/acknowledge`(`revision`·`note`)를 쓴다.

## AI 도움

직접 입력과 안내 모드는 같은 작업 상태를 사용한다. 모든 화면의 **AI와 대화**에서 설정을 설명하면 해당 화면을 찾아 입력 초안을 준비하고 부족한 항목을 질문한다. 예를 들어 `원천 DB는 PostgreSQL이고 호스트는 localhost, 포트는 5432야`라고 입력한 뒤 DB 이름·스키마·계정을 이어서 답할 수 있다. 명확한 설정은 로컬에서 처리하며 접속값·비밀번호·경로는 AI나 대화 기록에 보내지 않는다. 비밀번호는 연결 폼의 전용 칸을 사용하는 것이 좋다. 빈 필드는 바로 채우고 기존 값 변경은 비교 후 반영하며 마지막 변경을 되돌릴 수 있다. 폼을 직접 수정했거나 작업 판이 바뀌면 이전 제안을 다시 확인한다.

일반적인 절차 질문은 전송 내용을 확인한 뒤 실제 AI와 이어서 대화한다. 이 경로에는 질문·앞선 일반 대화·화면 항목·입력 유무만 보내고 실제 폼 값이나 기관 산출물을 첨부하지 않는다. 자료 없는 화면 안내에는 기관 승인 파일이 필요하지 않다. 기관 자료 분석은 기존 **허용 문맥으로 제안 요청**에서 승인·미리보기를 거친다. AI의 원장 후보 변경은 `PROPOSED` 행에만 반영할 수 있으며 사람 확정·예외 승인 이력을 생성하지 않는다.

일반 대화에서 SQL·소스 코드·구조화 자료 원문으로 식별되는 입력은 차단하며, 현재 접속 비밀과 이전 대화도 전송 전에 다시 검사한다. 자유 입력의 민감성을 완전히 판별할 수는 없으므로 기관 자료는 승인된 문맥 경로에서만 선택한다. 응답 대기 중 새로 작성한 입력에는 이전 응답의 자동 입력·후속 질문을 적용하지 않는다. 되돌리기는 해당 제안 이후 폼이 바뀌지 않았을 때만 제공한다.

대화는 브라우저와 실행기 메모리에서만 유지한다. **새 대화**, 인증 방식 변경·로그아웃, 실행기 재시작으로 일반 대화 연결을 정리하며 서버 대화는 30분 후 만료한다. 대화로 폼을 채워도 **연결 설정 저장**, 파일 선택·가져오기, DB 조사·실제 적재를 자동 실행하지 않는다. ZIP/DDL 파일은 브라우저의 파일 선택기에서 직접 선택한다.

공식 Codex가 현재 계정에 제공하는 기본 모델을 조회해 화면에 표시하고, 해당 모델로 격리 검사와 실제 연결 검사를 수행한다. 모델이 바뀌면 다시 검사하며 실패 시 다른 모델이나 API로 자동 전환하지 않는다.

Codex는 `--codex <공식 codex.exe 경로>`로 지정한다. 공식 app-server의 합성 로컬 provider 검사에서 내장 IO 도구나 로컬 경로 자동 첨부가 감지되면 모델 호출을 차단한다.

Codex 홈(작업공간의 `official-codex-client`)의 설정은 실제 세션에 상속되고 실행 인자로는 지워지지 않는다(Codex 0.162.1, 2026-10-25, 닫힌 loopback provider로 오프라인 실측). 그래서 실행기가 만들지 않은 설정·지시 입력(`config.toml`, `managed_config.toml`, `requirements.toml`, `AGENTS.md`, `AGENTS.override.md`, `instructions.md`, `hooks.json`, `.env`, `skills/`, `prompts/`, `rules/`, `plugins/`, `hooks/` — 대소문자 무시)이 그 홈에 있거나 작업 폴더 `empty/`가 비어 있지 않으면 Codex를 열지 않는다(`CODEX_HOME_CONFIG_PRESENT`). 요청마다 새 thread를 만들기 전에도 다시 검사하고, 합성 격리 검사도 실제 홈을 같은 조건으로 본다. 해당 파일·폴더를 지우거나 새 작업공간을 쓴다. Codex가 스스로 만드는 상태 파일(`*.sqlite`, `installation_id`, `.tmp`, `.sandbox_migration`)은 대상이 아니다. 고정 인자는 plugin 기능을 꺼(`features.plugins=false`) 시작할 때 공개 plugin 저장소를 받아 오지 않게 한다. 시스템 층 설정(`%ProgramData%\OpenAI\Codex` 등)과 홈 밖 사용자 skill 폴더는 막지 않는다. 다만 합성 검사와 실제 세션이 같은 조건으로 읽으므로 검사가 그 영향을 관측하며, skill 목록은 프롬프트에 넣지 않는다.

Gemini·Claude adapter는 아직 구현하지 않았으며 OAuth 토큰을 추출해 다른 API에 재사용하지 않는다. [공식 app-server 문서](https://developers.openai.com/codex/app-server)와 [설정 문서](https://developers.openai.com/codex/config-reference)가 인증·권한 설정의 외부 원본이다.

화면의 세 상태는 각각 확인한다.

1. **계정 인증:** **공식 로그인 시작** 후 표시되는 공식 페이지에서 인증한다. 대기 상태는 자동 갱신하며 **현재 계정 연결 확인**으로 다시 조회할 수 있다. 계정 로그인에는 기관 자료를 전송하지 않으며 기관 승인 파일이 필요하지 않다.
2. **실제 AI 연결 검사:** **고정 문구로 실제 연결 검사**는 `Reply with the exact text MIGRATION_CONNECTION_OK.`만 외부 모델로 보낸다. 접속정보·산출물·입력한 질문은 포함하지 않는다. 계정 사용량 또는 API 요금이 발생할 수 있으며, 화면에서 진행·실패·통과와 확인 시각을 구분한다. API 키를 저장한 것만으로 인증이나 연결 성공을 표시하지 않는다.
3. **기관 자료 전송 승인:** 로그인과 합성 연결 검사에 성공해도 승인 파일·전송 범위·격리 조건을 충족해야 실제 자료로 제안을 요청할 수 있다. 연결 검사 통과는 기관 승인이나 운영 적재 승인을 대신하지 않는다.

대기 중인 인증은 **로그인 취소**로 중단한다. **로그아웃**은 공식 연결의 인증을 해제하고, API 방식에서는 **현재 세션 API 키 해제**를 사용한다. 인증 상태나 제공자가 바뀌면 이전 전송 미리보기와 제안은 다시 확인하며 작업 원장과 질문 초안은 유지한다.

API 경로는 화면에서 **OpenAI API**를 직접 선택하고 모델명과 API key를 입력한다. 별도 API 요금이 발생하며 기관 자료로 제안을 요청할 때는 해당 서비스 전송 승인이 필요하다. 자동으로 유료 API로 전환하지 않는다. 요청은 고정된 공식 Responses API 주소로만 보내고 `store:false`, 빈 tool 목록, 구조화된 제안을 사용한다. `store:false`만으로 기관 보존 정책 충족이나 무보존을 보장하지 않는다([공식 구조화 응답 문서](https://developers.openai.com/api/docs/guides/structured-outputs)).

기관 승인 파일은 UI가 생성하지 않는다. 기관이 승인한 서비스·범위와 아래 필드를 맞춘 파일을 Git 밖에 두고 `--ai-approval <파일>`로 지정한다. `workspaceId`는 AI 상태 화면에서 확인한다. 승인 문서의 진위·승인권자는 기관 절차로 확인하며 실행기는 필드·범위·기한·작업공간 결속을 집행한다. 승인의 신선도(미리보기·읽기 계획·전송 전후 대조)는 승인 파일 바이트의 SHA-256으로 보므로 공백만 바꿔도 다시 확인해야 한다. `reference`는 200자 이하이며 제어문자가 없어야 한다(아니면 `INSTITUTION_APPROVAL_MISMATCH`). 이 승인 파일과 아래 전송 기록이 이 경로에서 [ADR-0029](../02-architecture/decisions/ADR-0029-legacy-standardization-migration.md) 결정 5의 이관 승인 원장 기록을 대신한다([ADR-0041](../02-architecture/decisions/ADR-0041-local-migration-workspace-and-ai.md) 대체 범위).

```json
{
  "policy": "migration-context-v1",
  "workspaceId": "AI 상태 화면의 작업공간 ID",
  "service": "openai-api",
  "reference": "기관 승인 문서 식별자",
  "processingLocation": "기관이 승인한 처리 위치",
  "retention": "기관이 승인한 보존 조건",
  "expiresAt": "기관 승인 만료 시각(ISO 8601)",
  "modes": ["restricted", "expanded"],
  "scopes": ["names", "candidates", "diagnostics", "excerpts"]
}
```

**전송 기록.** 근거 요청이 기관 자료 문맥(이름·후보·진단·발췌)을 외부 AI로 넘기기 직전에 실행기는 작업공간 색인(`workspace.json`)의 `ai.transmissions`에 한 건을 남긴다. 필드는 `id`, `sentAt`(전송 직전 기록 시각), `policy`, `provider`, `model`, `mode`, `approvalReference`, `approvalSha256`(승인 파일 바이트), `contextSha256`, `counts`(names·candidates·diagnostics·excerpts)다. `contextSha256`은 프롬프트에 들어간 문맥 JSON의 UTF-8 바이트 SHA-256이며 전송 미리보기 응답의 `contextSha256`과 같다. 경로·계정·호스트·JDBC URL·값·질문 원문·발췌 원문·API key는 남기지 않는다. 기록은 제공자에게 넘긴 문맥의 기록이라 응답 실패·검증 실패와 무관하게 남는다.

- 기록을 쓰지 못하면 보내지 않는다. 읽기 전용 작업공간·색인 검증 실패는 `AI_TRANSMISSION_RECORD_FAILED`, 다른 변경과의 판 충돌은 `AI_STALE_CONTEXT`, 실행 중인 작업이 있으면 `AI_JOB_ACTIVE`다(작업이 끝난 뒤 다시 요청한다). 기록이 1000건 차면 `AI_TRANSMISSION_LOG_FULL`로 새 전송을 막고 기록은 지우지 않으므로 새 작업공간을 쓴다.
- 기록 한 건은 작업공간 판을 1 올린다. 제안의 판과 AI가 시작하는 읽기 작업은 기록 뒤 판을 쓴다. 미리보기는 한 번 전송하면 소비되므로 다른 질문은 미리보기부터 다시 한다.
- 초안에 반영하면 원장 초안 항목 메모에 `AI 제안(미확정, 전송 기록 <id>, 문맥 SHA-256 <digest>): <근거>`를 덧붙여 후보와 전송 기록을 대조할 수 있게 한다.
- 화면 사용법 대화와 고정 문구 연결 검사는 기관 자료가 없어 기록하지 않는다.

**질문 검사.** 근거 요청의 자유 질문은 화면 대화와 같은 기준으로 다시 검사한다. 원천·대상 연결 프로필의 host·username·database·schema·instance·driverJar 값(3자 이상, 대소문자 무시), 소스 루트 같은 입력값, 세션 비밀, `호스트=`·`계정=`·`경로=` 같은 설정 표지, `localhost`와 `.com`·`.net`·`.org`·`.local`·`.internal`·`.kr` 서버 이름, 드라이브·UNC(`\\server\share`)·유닉스 절대 경로가 대상이다. 걸리면 `AI_SENSITIVE_CONTEXT`로 보내지 않는다. 대상 스키마 이름(예: `public`)처럼 흔한 단어도 질문에 쓰면 막힌다. 문맥(이름·후보)은 비밀·host·username 기준이라 스키마가 붙은 표 이름은 보낼 수 있다. UNC·유닉스 절대 경로는 이름·발췌·모델 응답 문구에서도 민감 위치로 보아 보류하거나 거부한다.

문맥 미리보기→전송 확인→질문/제안→선택한 초안 반영 순서다. 읽기 실행 계획을 허용하면 그 단계 중 모델이 제안한 **한 단계**를 실행하며, 새로운 결과를 다시 미리보고 후속 질문을 보낼 수 있다. 완전 자율 연속 실행은 제공하지 않는다. 계획은 철회할 수 있고 입력 판·제공자·만료가 바뀌면 다시 확인한다. 품질 분석(profile)을 허용하는 계획은 표당 행 한도 `profileRowLimit`(1~100,000 정수)를 함께 정해야 하고, AI가 시작하는 품질 분석은 그 값을 CLI `--profile-row-limit`으로 넘긴다. 한도가 없거나 범위 밖이면 `AI_PROFILE_ROW_LIMIT_REQUIRED`, profile 없이 한도만 주면 `AI_READ_PLAN_INVALID`다. 실행 횟수 상한은 따로 없고 30분 계획 만료와 한 번에 한 작업만 도는 직렬 실행이 범위다. 화면의 읽기 계획에서 데이터 품질 집계를 고르면 표당 행 한도 입력이 필수로 나타나고, 그 값을 로컬 API(`/api/ai/read-plan`의 `profileRowLimit`)로 계획과 함께 보낸다. 범위·필수 판정은 서버가 한다. 확장 모드에서는 실제 소스 분석 결과의 컬럼 사용처를 골라 발췌를 준비한다. API도 해당 경로·라인에 결속하며 최대 5개×40행, 전체 문맥 32KiB로 제한한다. 숨김 폴더·설정 파일은 제외하고 민감정보·문자열 literal이 있으면 보류한다. 미리보기의 실제 포함 내용과 제외 사유를 확인한다. 전체 소스·DB 행·값 분포를 보내지 않는다.

## 검증 및 한계

```powershell
npm run test:migration-workspace
node tools/migration-workspace/build-styles.mjs --check
node tools/migration-workspace-prototype/build-styles.mjs --check
```

`npm run test:migration-workspace`는 `tools/migration-workspace/`와 `tools/migration-workspace-prototype/`의 `*.test.mjs`를 모두 찾아 실행한다. 같은 파일이 `npm run test:operational-contracts`에도 들어 있어 필수 CI(`secret-scan`)·pre-push·`npm run verify`에서 돌고, [gate registry](../../config/governance/gates.json)의 운영 계약 카탈로그가 그 안의 `skip`·`only`·`todo`를 막는다. 다루는 범위는 로컬 HTTP 경계(실행 비밀·Host/Origin·요청 토큰), 입력 준비와 업로드 잠금, 저장·재시작 복구, 실행 요청과 결과 불명 작업 확인, AI 문맥 정책·질문 검사·전송 기록, Codex 홈 격리 조건, 시안 서버다.

[CLI 계약](../../tools/migration-workspace/cli-contract.test.mjs)은 JAR를 실행하지 않는 소스 대조 계약이다. 실행기를 가짜 자식 프로세스로 돌려 받은 인자를 Java CLI와 대조한다 — 명령별 옵션(`WorkflowCliOptions`), `--command`·`--mode` 값, adapter ID, object kind, `-D` 속성. 진단 코드는 `WorkflowFailureDiagnostic` 열거값과 정확히 같아야 하고(`CLI_FAILED`는 공통 기본값) 화면이 코드마다 안내를 가져야 하며, 산출물 형식 판·종류·필드 이름은 Java 상수와 같아야 한다.

[실제 실행 시험](../../migration-tool/src/test/java/nuri/migration/MigrationWorkspacePackagedCliIntegrationTest.java)은 Node 엔진의 기본 자식 실행으로 패키징한 JAR와 격리 PostgreSQL 17을 연결한다. 구조 조사→매핑→합성 검토→계획 검증→DRY_RUN, 산출물 변조·변경 JAR 거부, 원천 값·대상 무쓰기와 자식 프로세스 종료를 확인한다. 일반 `:migration-tool:test`와 생성 단일 모듈의 `migrationTest`에 포함되며, 엔진 3파일과 JAR 바이트를 Gradle 시험 입력으로 추적한다. 브라우저·HTTP·AI·COMMIT을 통합한 시험은 아니다.

원본 저장소의 측정 출처 검사는 `refs/remotes/origin/main`과 측정 기준 커밋까지의 이력을 요구한다. 단일 브랜치·얕은 clone에서는 이 참조와 이력을 먼저 가져와야 한다. 내보낸 독립 제품은 승인 lock으로 출처를 확인하므로 기관 저장소에 이 원격 참조를 요구하지 않는다.

`--check`는 파일을 쓰지 않고 커밋본 CSS와 비교해 낡으면 종료 코드 1, 잘못된 인자는 2로 끝난다. 다시 만드는 명령은 `npm run migration:ui:css`이며 시안 CSS에는 frontend 의존성이 필요하다. 운영 계약 시험이 두 CSS의 신선도를 늘 보므로 `premium.css` 토큰·시안 화면 클래스·설치된 Tailwind 판이 바뀌면 다시 만들 때까지 붉다.

두 디렉터리는 CodeQL JavaScript 분석 범위([codeql.yml](../../config/security/codeql.yml))에 들어 있고 로컬 근사(`npm run sast:approx`)도 같은 범위를 본다. 작업공간의 `engine.mjs`·`store.mjs`·`inputs.mjs` 변경은 실제 실행 시험의 입력이므로 CI의 이관·이관 mutation 검증도 켠다. 생성 Groovy의 경로 참조를 따라가는 기존 보수적 reader 검사는 이 세 파일에 backend·E2E 축도 요구한다. 이 정적 참조는 해당 시험이 엔진 바이트를 직접 실행한다는 증거와 구분한다. 이 세 파일은 이관 독립 제품에 포함하고 이관 도입 승인 digest에도 묶는다. 나머지 UI·서버·AI·시안 경로의 도구 분류는 유지한다([DEC-OPS-391](../archived/operational-decisions-history.md#dec-ops-391)).

이 검사는 실제 기관 DB, Oracle 등 driver별 버전, 실제 AI 계정 로그인·요금·응답 품질, 운영 규모 성능을 검증했다는 뜻이 아니다. 실제 실행 결과를 확인하기 전에는 운영 전환에 사용하지 않는다.
