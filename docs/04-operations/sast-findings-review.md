# SAST 오탐 예외 검토 결과

2026-09-09 후속 Java 전체 분석에서 종전 Medium 41건이 0건이 됐다. 110개 보안 쿼리의 결과는
기존 승인 예외 5건뿐이며 차단·정책 오류는 0건이다. 예외 추가나 임계값 완화는 없다.

별도 의존성 재검증에서는 실제 runtime의 Tomcat 10.1.57에 대한 Dependabot Critical 3건을 확인해
10.1.59로 올렸다. [Apache 공식 공지](https://tomcat.apache.org/security-10.html#Fixed_in_Apache_Tomcat_10.1.59)에
따르면 수정된 10.1.58은 릴리스 투표를 통과하지 않아 배포된 수정본은 10.1.59다.
`dependencyInsight`와 runtime classpath에서 core·EL·WebSocket 10.1.59를 확인했고 인증·인가 테스트
19건이 통과했다. 이는 위 SAST 예외와 별도이며 나머지 개발 의존성 경고를 예외 처리하거나 닫지 않는다.

- 로그 주입 40건: 검색어·메일 제목·사용자 식별자의 불필요한 복제를 제거했다. 진단에 필요한 경로와
  식별자는 [`SafeLog`](../../foundation/src/main/java/nuri/foundation/security/util/SafeLog.java)로
  CR/LF·제어문자·유니코드 줄 구분자를 치환하고 256자로 제한한다. 개인정보 마스킹이나 비밀 기록 허용 도구는 아니다.
- unreleased-lock 1건: `User.lock()`은 동기화 잠금이 아니라 로그인 실패에 따른 계정 상태 변경이다.
  `lockAccount()`·`unlockAccount()`로 의미를 명확히 했으며 잠금 유지·시간 경과 해제·성공 로그인 초기화 테스트를 유지했다.
- SAST-FP-001/002의 파일과 방어 코드에서는 위 로깅만 변경됐다. Bearer·STATELESS·Origin·Strict cookie
  및 legacy CSRF 경계는 동일함을 재검토하고 소스 해시를 갱신했다. 기존 fingerprint·행·만료일·예외 수는 유지한다.

검토·승인일: 2026-09-09. 도구: CodeQL 2.26.4, Java·JavaScript `security-extended`. 사용자의 “확실한 오탐이면 예외로 등록” 요청에 따라 아래 7건을 소스·데이터 흐름·기존 검증과 재대조하고 **한정 예외로 등록**했다. 이는 각 탐지의 전제에 대한 판단이며 도메인 전체의 보안 인증은 아니다.

| 탐지 | 위치 | 검토 근거 |
|---|---|---|
| CSRF 비활성화 | `ApiSecurityConfig.java:160` | API 체인은 STATELESS·Authorization Bearer 헤더 인증이다. 변경 요청에는 Origin 검증이 있고 refresh cookie는 SameSite=Strict다. 별도 legacy 체인의 Cookie CSRF는 활성화되어 있다. |
| CSRF 비활성화 | `SecurityConfig.java:60` | API 모듈 부재 시에만 적용되는 코어 체인이며 동일한 Bearer·STATELESS·Origin 검증을 사용한다. |
| 사용자 입력에 따른 보안 검사 우회 | `OperationalAuditInterceptor.java:105` | `/api/` 외 요청을 감사 대상에서 제외하는 분기가 loginId 해석 호출에 연결된 탐지다. 이 메서드는 접근 허용을 결정하지 않고 감사 이벤트만 발행한다. |
| 사용자 입력에 따른 보안 검사 우회 | `UserAuthorityManageService.java:78` | null·빈 배치가 저장 없이 반환되는 기존 no-op 계약이다. 유효한 저장 경로는 권한의 실제 존재를 확인한다. |
| 사용자 입력에 따른 보안 검사 우회 | `UserAuthorityManageService.java:154` | 부서·권한 식별자가 없는 요청은 저장 없이 반환한다. 유효한 요청은 권한 존재를 확인한 뒤 저장한다. |
| 안전하지 않은 임시 파일 생성 | `ui-quality-baseline-launch.mjs` | 실제 호출은 `O_RDONLY`로 기존 파일을 읽기만 한다. POSIX에서는 `O_NOFOLLOW`·`O_NONBLOCK`도 적용한다. 파일 생성이 없으며 descriptor의 dev·ino·크기와 경로·symlink·읽기 전후 상태를 검증한다. 복구용 Compose는 별도 exact schema 검증도 거친다. |
| 설정 파일의 빈 비밀번호 | `application-test.yml:22` | 네트워크 DB가 아닌 `jdbc:h2:mem:testdb` 테스트 프로필이다. H2는 `testImplementation`/`testRuntimeOnly` 의존성이고 운영 DB 설정과 분리된다. |

## 적용한 처리

각 항목을 **규칙 ID + 파일·행 + CodeQL fingerprint + 소스와 보완 방어 파일의 SHA-256 + 만료일**에 결속한다. SHA-256은 UTF-8 소스의 CRLF를 LF로 정규화하여 OS 간 동일하게 판정한다. 목록 밖 탐지, 코드 변경, 만료, 예상 건수 불일치는 실패시킨다. 전체 규칙·경로 제외, 보안 임계값 변경, 기존 High 일괄 baseline은 적용하지 않는다. 만료일은 2026-12-08이며 다음 날부터 실패한다. 갱신은 재검토와 승인이 필요하다.

[정책 evaluator](../../scripts/sast-policy.mjs)는 [승인 목록](../../config/security/false-positive-review.json)과 정확히 일치한 탐지만 예외 처리한다. 실제 원본 SARIF의 임의 suppression은 효력이 없다. 감사용 SARIF에는 모든 탐지와 예외 ID·사유·만료일을 남기며 14일 artifact로 보존한다. GitHub Security 게시본에서만 승인된 개별 탐지를 제외하고 나머지 탐지와 규칙 metadata는 유지한다. 이는 GitHub가 문서화한 SARIF 지원 항목에 suppression 판정이 없으므로 자체 게이트의 결정을 명시적으로 반영하는 방식이다([GitHub SARIF 지원](https://docs.github.com/en/code-security/reference/code-scanning/sarif-files/sarif-support)).

예외 설정·해시가 잘못되면 모든 탐지를 보존한 리포트를 생성하고 실패한다. 언어별 기존 예외가 사라진 경우도 재검토를 요구한다. 목록 자체는 `HarnessBaselineIntegrityTest`의 registry 해시 동결 대상이므로 변경 시 승인 근거와 baseline diff가 함께 필요하다. 저장소 변경만으로 원격 ruleset이나 메인 반영을 완료한 것으로 보지 않는다.

## 근거 소스와 검증

- [API 보안 체인](../../api-server/src/main/java/nuri/api/config/ApiSecurityConfig.java), [코어 보안 체인](../../business-core/src/main/java/nuri/business/security/config/SecurityConfig.java), [Bearer 해석](../../foundation/src/main/java/nuri/foundation/security/jwt/JwtTokenProvider.java), [Origin 필터](../../foundation/src/main/java/nuri/foundation/security/filter/OriginValidationFilter.java), [refresh cookie](../../foundation/src/main/java/nuri/foundation/security/util/CookieUtil.java).
- [감사 인터셉터](../../api-server/src/main/java/nuri/api/interceptor/OperationalAuditInterceptor.java), [권한 배치 서비스](../../business-core/src/main/java/nuri/business/service/auth/UserAuthorityManageService.java), [빈 입력·유효 권한 검증 테스트](../../business-core/src/test/java/nuri/business/service/auth/UserAuthorityManageServiceTest.java).
- [읽기·복구 구현](../../scripts/ui-quality-baseline-launch.mjs), [실행 계약 테스트](../../scripts/ui-quality-baseline-launch-contract.test.mjs).
- [H2 테스트 설정](../../api-server/src/main/resources/application-test.yml), [테스트 의존성](../../api-server/build.gradle).

## 구현 감사 (L2)

[백엔드 헌법](../../.agent/knowledge/backend-api-constitution/artifacts/constitution.md)과 [프론트엔드 헌법](../../.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md) 전문을 변경 diff와 대조했다.

| 기준 | 변경과 판정 근거 |
|---|---|
| 백엔드 제1~7조: 계층·DTO·예외 | 페이지 입력 검증은 API 지원 클래스에서 수행하며 공통 `BusinessException`을 사용한다. Entity나 서비스 의존성 방향은 바뀌지 않는다. |
| 백엔드 제8~11조: 인가·트랜잭션·비밀 | 기존 소유권·관리자 가드를 유지한다. CSRF·감사·빈 권한 입력의 탐지는 기존 의미를 바꾸지 않고 위 승인 목록의 정확한 위치로 한정한다. 신규 SAST job은 앱/OCI 자격증명을 받지 않는다. |
| 백엔드 제13·14조: 로그·자원 상한 | 신뢰 프록시 설정 원문을 로그에서 제거하고, 페이지 계산 전에 페이지 번호와 크기(1~100)를 검사한다. 파일 복사·실패 정리 경로가 저장소 루트 안인지 명시적으로 확인한다. |
| 양단 검증 계약: 백엔드 제16조·프론트 제13조 | 메뉴 라우트 정규식의 허용 의미를 유지하며 중첩 반복을 제거했다. 실제 OpenAPI를 다시 내보내 TypeScript·Zod를 재생성했다. DB 컬럼·타입·길이 변경은 없다. |
| 프론트 제3·7·11조: 렌더링·폼 | HTML에서 평문을 추출하는 정규식을 기존 DOMPurify 기반 파서로 교체했다. FAQ 문단·줄바꿈과 정책 본문 빈 값 검증은 영향 테스트로 확인했다. |
| 프론트 제8조: 성능 | production build와 고정 gzip bundle budget 검사를 통과했다. 실제 브라우저 과업/E2E의 통과를 뜻하지는 않는다. |
| 프론트 제14조·AGENTS H2/H5: 게이트 무결성 | 두 언어의 취약/안전 fixture와 정책 CLI 종료 코드, 실행 연결을 끊는 부정 테스트를 확인한다. 승인된 7건 외의 신규·변형 탐지와 소스·방어 코드 변경, 만료·건수 불일치를 차단한다. SAST 승인 목록을 registry 동결에 추가하며 기존 도메인 예외 목록은 유지한다. |
| 파일 처리 방어 | 경로 재조회 대신 검증한 descriptor로 내용을 읽는다. POSIX symlink와 FIFO 거부는 네트워크를 끈 Linux 컨테이너에서 실제 검증했다. |

UI URL-state census 변경은 새 보조 소스 파일 한 개에 따른 파일 수·manifest 해시 갱신이다. 기존 381개 분류와 승인 범위는 동일하다. SAST의 7.0 미만 탐지는 계속 리포트 대상이다. 이번에 재검토한 Java Medium 41건의 결과는 문서 첫머리에 기록하며, 향후 새 탐지까지 검토한 것으로 간주하지 않는다. 원격 required CI·E2E 및 ruleset 반영은 이 로컬 감사의 완료 범위에 포함하지 않는다.
