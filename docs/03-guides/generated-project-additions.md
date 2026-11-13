# 생성 프로젝트에 Java와 권한 추가하기

새로 생성한 프로젝트에서 변경하기 전에 초기화한다. 원본 저장소에서 실행하는 명령이 아니다.

```sh
node scripts/adopter-project.mjs init
```

기존 온라인 모듈의 `src/main/java`에 새 Java를 더하고 `config/governance/permission-catalog.json`에 새 권한을 정의한다. 새 코드는 20자 이내의 대문자·숫자·밑줄이며 기본 그룹은 반드시 빈 배열이다.

```json
{ "code": "ADOPTER_READ", "domain": "ADOPTER", "action": "READ", "name": "기관 업무 조회", "defaultGroups": [] }
```

새 API를 노출한다면 인가 원장에 새 handler와 새 권한의 `PERMISSION` 바인딩 및 해당 endpoint/service/manual guard를 추가한다. 기존 원장 행은 수정하지 않고 뒤에 덧붙인다. 기존 그룹에 새 권한을 자동 부여하지 않는다. 도메인 owner 검사와 관리자 범위는 기존 하네스·구현 규칙대로 적용한다.

operation/endpoint의 handler는 FQN(`nuri.api.controller.adopter.ExampleController#read`), service guard의 target은 Java 하네스와 같은 단순 클래스명(`ExampleService#read`)을 쓴다. 추가 타입의 단순 이름도 유지·제거된 타입과 중복될 수 없다.

새 조회 API의 OpenAPI 계약은 `api-docs.json`에 추가한다. 기존 연산·스키마·설정은 보존하고 새 연산은 추가한 handler의 바인딩에 대응해야 한다. 새 스키마와 태그만 추가할 수 있으며 외부 `$ref`는 허용하지 않는다. 등록은 이 명세에서 기존 API 타입·Zod·operations 생성기를 실행해 생성물을 만든다. 생성 타입을 손으로 수정하지 않는다. 도입자 검증의 governance 단계도 임시 재생성과 현재 생성물을 대조한다.

`config/governance/permission-bundles.json`의 `excluded`에도 새 코드와 개별 사유를 덧붙인다. 이는 역할 묶음의 분류이며 품질 검사 예외가 아니다. 기존 묶음·제외 행은 변경할 수 없다. 새 권한을 기존 묶음에 넣으면 묶음 적용 시 의도치 않게 배정될 수 있으므로 추가 전용 등록은 이를 허용하지 않는다.

```json
{ "code": "ADOPTER_READ", "reason": "기관 추가 조회 권한은 기존 역할 묶음에 자동 포함하지 않는다." }
```

```sh
node scripts/adopter-project.mjs register --reason "기관 업무의 새 조회 서비스와 미배정 권한 추가"
npm run regen
npm run verify:adopter
```

새 연산과 operation binding은 GET만 받는다. 기존 연산과 리터럴·템플릿 세그먼트가 겹치는 새 경로도 거부한다. 예를 들어 기존 `GET /x/{id}`에 `GET /x/probe`를 더해 기존 요청을 가릴 수 없다.

`register`는 API 계약·권한·하네스 출력을 만든다. 이어지는 `regen`은 계약 변경에 따른 경계 census 등 나머지 파생물을 동기화하므로 함께 실행한다. 복잡한 스키마 표현은 기존 투영·생성기의 지원 범위를 따른다.

등록 명령은 Java 파일·권한 입력의 현재 해시와 사유를 기록하고 권한 생성물 및 하네스 census를 다시 만든다. 추가분을 고친 뒤에는 다시 등록한다. 등록하지 않은 변경, 기존 소스의 변경·삭제, 원본에서 제거된 기능의 부활, 기본 그룹 부여, 공개 접근 바인딩 추가는 거부한다. 실패하면 이 호출의 생성물만 복원하며 입력 수정은 남는다. `adopter-project.json`과 관련 diff를 함께 검토·커밋한다. 이 파일에는 비밀 값이나 운영 데이터를 넣지 않는다.

검증은 등록만으로 통과하지 않는다. 새 엔티티에는 물리 스키마가 필요하고, 새 handler·DTO에는 원래 계약과 시험이 필요하다. 기존 소스 수정, 새 화면·마이그레이션, 기존 권한/기본 그룹 변경은 이 추가 전용 자동 등록이 지원하지 않는다. 필요한 변경은 기관의 별도 설계·검증 절차로 다룬다.

신규 자원 생성 POST처럼 `ResponseContractLinterTest.CREATED_HANDLERS` 등 동결된 개별 분류표의 변경이 필요한 작업도 이 자동 등록 범위 밖이다. 등록이 하네스 분류·부채 상한·소비자 배선 검토를 대신하지 않는다. 추가분 전체를 철회하려면 Git에서 초기화 전 커밋으로 관련 입력·생성물·등록 파일을 함께 되돌리고 원본 full 검증을 실행한다.

생성 CI와 pre-push는 유효한 등록이 있으면 같은 검사 묶음을 도입자 범위로 실행한다. 직접 실행할 때는 `npm run verify:adopter`를 쓴다. `npm run verify`와 `verify:full`은 생성 당시 결속을 계속 검사하므로 추가 뒤에는 실패하는 것이 정상이다. 원본의 잠금·투영 해시를 덮어써서 통과시키지 않는다.

`build/reports/reusable-base/adopter.json`은 등록된 소스의 기술 검증 결과다. `adopterRevision`에는 봉인된 codeScope와 등록 파일의 원시 바이트 SHA가 실리므로 줄 끝이 다른 체크아웃의 등록 SHA는 다를 수 있다. 원본 `full.json`·벤더 인증·기관 승인을 대체하지 않는다. 기관의 권한 부여·업무 시나리오·운영 환경 승인은 현재 소스에 대해 별도로 확보한다. [ADR-0057](../02-architecture/decisions/ADR-0057-adopter-java-and-permission-registration.md)에 경계와 근거가 있다.
