# 도메인 선택형 프로젝트 생성기

원본의 모듈러 모노리스 구조를 유지하면서 선택한 업무의 소스·PostgreSQL DDL·메뉴·초기 권한을 독립 프로젝트로 생성한다. Foundation과 Core는 항상 포함하며, 결과물의 백엔드는 기존 멀티모듈 또는 단일 Gradle 프로젝트 중 선택한다. 설계 근거와 지원 경계는 [상세 설계](../02-architecture/project-composer-design.md), 기존 릴리스 프로필 명령은 [재사용 가이드](reusable-base-guide.md)에 있다.

공통 엔진·CLI·로컬 UI에서 20개 도메인을 선택한다. 생성 작업마다 전체 기술 검증을 실행하며, 생성 결과는 아래 보고서의 실제 실행 상태로 확인한다.

## 실행

저장소 루트에서 다음 명령을 실행하고 **http://127.0.0.1:3100**을 연다.

```bash
npm run project:ui
```

로컬 생성기 서버가 별도 화면과 공통 엔진을 제공하므로 기존 업무 서버에 로그인하지 않아도 선택·계획 조회가 가능하다. 서버는 loopback에서만 요청을 받는다.

프로젝트명, 시작 preset 또는 개별 도메인, PostgreSQL, 출력 구조를 선택한다. 계획에는 자동 포함 사유, 포함 메뉴와 테이블 수, 외부 설정 요구사항이 표시된다. 생성 버튼을 누르면 DB 구성 → 소스 구성 → 의존성 설치 → 기술 검증 순으로 진행한다. 생성 실패 시 입력을 유지하며 다시 시도할 수 있다.

소스 생성과 검증에는 Docker, Java 21, Node.js 22 이상, pnpm 및 의존성 다운로드 환경이 필요하다. 초기 설치와 빌드에 시간이 걸리며 화면을 새로 열어도 실행 중 작업을 조회할 수 있다. 생성기 프로세스를 종료한 작업을 자동 재개하는 기능은 제공하지 않는다.

## 선택과 의존성

20개 업무 도메인의 소유권은 [카탈로그](../../scripts/project-composer-catalog.mjs)가 기존 프로필 manifest, Java 소스, 권한 카탈로그와 명시된 화면 소유권으로 확인한다. [순수 해석기](../../scripts/project-composer-recipe.mjs)가 필수 의존성을 함께 포함한다. UI와 CLI는 동일한 해석기와 생성 엔진을 사용한다.

- 게시판·댓글·스크랩은 기존 필수 클러스터다.
- 현재 공동 화면의 직접 참조로 쪽지·스크랩, 게시판·도움말·커뮤니티, 일정·업무 보고가 함께 포함된다.
- 커뮤니티 관리 화면에는 템플릿, 설문과 통계의 공동 화면에는 설문·통계가 필요하다. 이 제약은 자동 포함 사유로 표시한다.
- 주소록은 메일·문자 화면의 선택 연동이다. 주소록을 고르지 않으면 해당 연동만 제외한다.
- 기존 `core`·`collaboration`·`demo` preset은 기존 포함 범위를 유지한다. 개별 도메인 선택은 선택 화면을 보존하기 위해 추가 의존성을 포함할 수 있으므로 같은 도메인 목록을 수동 선택한 결과가 기존 preset과 항상 같지는 않다.

단일모듈 출력에서도 기존 디렉터리와 패키지, 테스트 자원의 논리적 경계는 보존한다. 파일을 하나의 `src` 폴더로 평탄화하는 방식은 아니다.

## recipe와 CLI

UI의 **선택 정보 저장**으로 recipe를 보관한다. 다음과 같은 파일을 직접 작성해도 된다. `sourceRef`는 현재 체크아웃을 가리켜야 하며 생성기가 다른 버전을 자동 checkout하지 않는다.

```json
{
  "schemaVersion": 1,
  "project": { "name": "agency-service" },
  "sourceRef": "HEAD",
  "selection": { "domains": ["mail", "schedule"] },
  "database": { "vendor": "postgresql" },
  "backendLayout": "single-module"
}
```

```bash
npm run project:catalog
npm run project:plan -- --recipe agency-service.recipe.json
npm run project:create -- --recipe agency-service.recipe.json
```

`schemaVersion`은 `1`이다. `selection`은 `domains`와 `preset` 중 하나만 받으며, `{"preset":"collaboration"}`처럼 사용할 수 있다. `domains: []`는 Foundation/Core만 포함한다. 프로젝트명은 소문자로 시작하는 1~63자이며 영문 소문자·숫자·단어 사이 하이픈을 허용한다. Windows 예약 이름과 알 수 없는 필드는 거부한다. `backendLayout`은 `multi-module` 또는 `single-module`이며 생략하면 `multi-module`이다. DB는 `postgresql`만 지원한다. UI가 저장하는 recipe의 `sourceRef`는 해당 체크아웃의 정확한 commit이다.

현재 선택 가능한 ID는 `addressbook`, `board`, `comment`, `dashboard`, `help`, `informalsanction`, `isg`, `mail`, `memoreport`, `note`, `notification`, `operation`, `report`, `schedule`, `scrap`, `sms`, `stats`, `survey`, `system`, `template`이다. 한국어 이름과 최신 의존성은 `npm run project:catalog`와 UI에서 확인한다.

## 결과 인수

완료 화면의 프로젝트 폴더와 검증 보고서 경로를 확인한다.

| 위치 | 내용 |
|---|---|
| `build/reusable-base/source/<프로젝트명>-<생성 ID>` | 독립 소스 프로젝트 |
| `build/reusable-base/composer-<프로젝트명>-<생성 ID>-db` | PostgreSQL baseline·시드·DB lock |
| `project-recipe.json`, `project-composition.json` | 사용자 선택과 해석된 구성 |
| `reusable-base-lock.json` | 원본 commit, 배치, 구성·DB 식별, 제외 및 검증 범위 |
| `project-generation-report.json` | 원본 파일 지문, 실행한 기술 검증, 결과 |

생성기는 새 디렉터리만 사용한다. 소스 구성은 `.pending-` 디렉터리에서 진행하고, **의존성 설치 전에 최종 위치를 고정**한다. Windows pnpm의 절대 경로 junction이 끊어지지 않도록 설치·검증 후 폴더를 rename하는 승격은 하지 않는다. 최종 위치의 보고서는 `verifying`이며 모든 검증을 통과한 뒤에만 `passed`와 완료 화면을 제공한다. 폴더가 만들어졌다는 사실만으로 인수 완료로 판단하지 않는다. 실패한 작업은 `failed`로 표시하고 결과·실패 단계·명령 식별자를 `build/project-composer/jobs/`와 이미 생성된 프로젝트에 보존한다.

생성한 프로젝트를 원하는 위치로 복사해 자체 저장소로 관리한다. 경로를 옮기면 `node_modules`를 가져오지 않고 새 위치에서 `npm ci`와 `pnpm -C frontend install --frozen-lockfile`을 실행한다. 초기 `.git`은 부모 저장소의 ignore 규칙을 차단하는 독립 경계이며 자동 커밋·push·원격 연결은 없다. 생성 프로젝트의 `REUSABLE_BASE.md`, `REUSABLE_VERIFICATION.md`에 해당 배치의 실행·검증 명령이 있다. 생성 후 실행에는 원본 저장소나 생성기 서버가 필요하지 않다.

로컬 체크아웃에 변경분이 있거나 릴리스 태그가 아니면 개발용 산출물로 기록한다. recipe의 commit만으로 미커밋 소스가 재현되는 것은 아니므로 결과 소스와 파일 지문도 함께 보관한다.

## 검증과 DB 경계

생성기는 포트를 공개하거나 공유 볼륨을 연결하지 않는 전용 PostgreSQL 컨테이너를 만들고, 체크인된 migration으로 구성한 스키마를 선택한다. 다른 빈 DB의 하나의 연결에서 DDL과 시드를 순서대로 재적용하여 세션 설정의 영향과 테이블·sequence·컬럼·FK·인덱스·trigger·메뉴·권한을 확인한다. 완료·실패 모두 자신의 소유권 표식이 일치하는 컨테이너만 정리한다. 업무 서버의 DB 연결정보를 입력받거나 그 DB를 축소하지 않는다.

소스 생성 후에는 선택한 코드·화면 존속, 원장 정합성, Java 컴파일·하네스·스키마 검사, 프런트엔드 타입·lint·build를 실행한다. 실패한 폴더와 보고서는 보존하되 완료 결과로 제공하지 않는다. 모든 부분집합을 사전에 인증했다는 의미는 아니며 **각 생성 작업 자체가 검증을 통과해야** 완료된다.

[CI](../../.github/workflows/ci.yml)와 같은 대표 조합의 전체 생성·검증 경로는 다음과 같다. 두 명령은 각각 새 전용 DB 컨테이너와 새 프로젝트를 만들고 의존성을 설치하므로 단순한 계획 조회보다 오래 걸린다.

```bash
node scripts/verify-project-composer.mjs --layout multi-module
node scripts/verify-project-composer.mjs --layout single-module
```

멀티모듈은 mail+schedule, 단일모듈은 board+survey를 검증한다. 생성 프로젝트의 `build/reports/reusable-base/full.json`과 `project-generation-report.json`에서 실제 `passed` 여부, 원본 commit·profile·layout을 확인한다. 실행하지 않은 조합이나 기관 업무 흐름은 이 보고서로 통과한 것으로 간주하지 않는다.

기관의 실제 DB 연결, 메일·문자 공급자, 비밀, 로그인 후 실제 업무 흐름과 운영 승인은 도입 환경에서 설정·검증한다. 생성기의 기술 검증은 해당 기관의 실행·운영 승인으로 승계되지 않는다.

## 메뉴 미리보기 자료 갱신

[메뉴 snapshot](../../config/project-composer-menus.json)은 SQL을 실행하지 않고 계획 화면에 실제 메뉴 이름·부모·목적지를 표시하기 위한 파생 자료다. 정본은 체크인된 migration·seed·authorization Contract SQL이며, snapshot을 손으로 고쳐 메뉴를 변경하지 않는다. [검증기](../../scripts/project-composer-menu-preview.mjs)는 입력 SQL의 파일명·내용 해시를 확인하고 달라졌으면 계획을 거부한다. DB 생성 시에도 원본 migration으로 만든 실제 메뉴·프로그램과 snapshot 전체를 다시 대조한다. 프런트엔드 화면 route 수와 메뉴 수는 다를 수 있다.

원본 SQL에 정당한 메뉴 변경을 적용한 뒤에는 **이번 갱신 작업만을 위해 새로 만든 일회용 PostgreSQL 17 컨테이너**에서 아래 명령을 실행한다. 포트 공개·공유 볼륨 없이 고유 이름과 소유권 표식을 붙이고, 자격증명은 명령 인자나 파일에 쓰지 않고 임시 환경으로 전달한다. 준비 상태를 확인한 후 PowerShell 변수 `$composerContainerName`에는 해당 컨테이너 이름, `$composerRunId`에는 이번 작업의 새 식별자를 사용한다. 운영·공유·기존 업무 DB 컨테이너는 지정하지 않는다.

```powershell
node scripts/generate-reusable-base-db.mjs --profile demo --write-menu-snapshot --container $composerContainerName --output "build/reusable-base/menu-snapshot-$composerRunId" --allow-dirty --allow-non-release-ref
```

명령은 컨테이너 안의 새 임시 DB에 전체 migration을 적용하고, 생성 SQL을 또 다른 빈 DB에 재적용하여 검증한 뒤에만 `config/project-composer-menus.json`을 갱신한다. 두 임시 DB는 생성기가 정리한다. 전용 컨테이너는 생성 시 확보한 정확한 ID와 소유권 표식이 일치하는지 확인한 뒤 이 작업의 소유자가 정리한다. 위 두 허용 옵션은 체크아웃 수정분·비릴리스 상태에서 로컬 자료를 갱신하기 위한 것이며 결과를 공식 릴리스로 바꾸지 않는다.

갱신한 SQL·snapshot diff를 함께 검토하고 다음 계약 검사를 실행한다. fixture 테스트는 SQL 변경 뒤의 오래된 snapshot과 잘못된 메뉴·프로그램 관계가 거부되는지도 확인한다.

```bash
node --test scripts/project-composer-menu-preview.test.mjs scripts/project-composer-db.test.mjs
```
