# SAST 오탐 예외 검토 결과

> 승인 목록은 2026-10-21 부터 비어 있다. 그 전의 최초 승인·재검토·구현 감사 기록은 2026-11-22 에 [보관 기록](../archived/sast-findings-review-log.md)으로 옮겼다. 이 문서에는 해소 결과와, 앞으로 예외를 다시 둘 때 따를 결속 형식만 둔다.

## 2026-10-21 예외의 근본 해소

2026-10-20 사용자는 승인된 예외 6건을 도구 회피가 아니라 원인을 없애는 방식으로 모두 해소하라고 지시했다. 각 건은 코드를 고쳐 탐지 원인을 없애고 같은 변경에서 [승인 목록](../../config/security/false-positive-review.json)의 항목을 지웠다. 목록은 비었고 차단 임계값(7.0)과 정책 evaluator는 그대로다. 목록 항목은 실제 탐지와 정확히 한 번 짝지어져야 통과하므로, 고친 코드에서 같은 탐지가 다시 나오면 required `secure-coding`이 실패한다.

| 예외 | 해소 |
|---|---|
| SAST-FP-001·002 CSRF 비활성 | API·코어 체인에서 CSRF를 켰다. 쿠키 자격을 실은 쓰기 요청에 이중 제출 토큰을 요구하고 SockJS는 허용 Origin으로 막는다([ADR-0038](../02-architecture/decisions/ADR-0038-credential-cookie-csrf-token.md)). |
| SAST-FP-003 감사 범위의 사용자 입력 분기 | 원시 `getRequestURI()` 접두어 대신 인터셉터 등록·보안 체인과 같은 Spring 경로 매처로 감사 범위를 판정한다. 컨텍스트 경로 아래 배포하면 API 요청이 통째로 감사에서 빠지던 결함도 함께 닫았다. |
| SAST-FP-006 개발 도구의 공용 임시 폴더 | 이름이 고정이라 다른 로컬 사용자가 먼저 만들 수 있던 실행 디렉터리를 사용자 캐시(`~/.cache`)로 옮기고, POSIX에서는 소유자·권한(그룹·기타 쓰기 금지)을 검사한다. |
| SAST-FP-007 설정 파일의 빈 비밀번호 | 제품 jar에 실리던 `src/main/resources/application-test.yml`을 지웠다. 같은 이름의 테스트 리소스가 클래스패스에서 앞서 이 파일을 가리므로 시험 동작은 바뀌지 않는다. |
| SAST-FP-008 SockJS 쿠키 인증의 사용자 입력 분기 | 직접 짠 토큰 분기를 Spring Security 표준 인증 필터(변환기·인증 제공자·실패 처리기)로 옮겼다. 성공 시 새 보안 컨텍스트를 저장하고 실패 시 비운다. 전송 경로 하네스는 공개 요청 매처로 범위를 검사한다. |

각 변경은 회귀 시험의 red(옛 코드에서 실패)를 확인했다. 탐지 해소 여부는 CodeQL 2.26.4 로컬 재분석과 해당 변경의 required CI가 판정한다.

## 적용한 처리

각 항목을 **규칙 ID + 파일·행 + CodeQL fingerprint + 소스와 보완 방어 파일의 SHA-256 + 만료일**에 결속한다. SHA-256은 UTF-8 소스의 CRLF를 LF로 정규화하여 OS 간 동일하게 판정한다. 목록 밖 탐지, 코드 변경, 만료, 예상 건수 불일치는 실패시킨다. 전체 규칙·경로 제외, 보안 임계값 변경, 기존 High 일괄 baseline은 적용하지 않는다. 만료일이 지나면 다음 날부터 실패하며, 갱신은 재검토와 승인이 필요하다.

[정책 evaluator](../../scripts/sast-policy.mjs)는 [승인 목록](../../config/security/false-positive-review.json)과 정확히 일치한 탐지만 예외 처리한다. 실제 원본 SARIF의 임의 suppression은 효력이 없다. 감사용 SARIF에는 모든 탐지와 예외 ID·사유·만료일을 남기며 14일 artifact로 보존한다. GitHub Security 게시본에서만 승인된 개별 탐지를 제외하고 나머지 탐지와 규칙 metadata는 유지한다. 이는 GitHub가 문서화한 SARIF 지원 항목에 suppression 판정이 없으므로 자체 게이트의 결정을 명시적으로 반영하는 방식이다([GitHub SARIF 지원](https://docs.github.com/en/code-security/reference/code-scanning/sarif-files/sarif-support)).

예외 설정·해시가 잘못되면 모든 탐지를 보존한 리포트를 생성하고 실패한다. 언어별 기존 예외가 사라진 경우도 재검토를 요구한다. 목록을 바꾸면 그 diff 에 승인 근거를 함께 남긴다(재사용 생성물에서는 `HarnessBaselineIntegrityTest`의 registry 해시 동결 대상이다, DEC-OPS-420). 저장소 변경만으로 원격 ruleset이나 메인 반영을 완료한 것으로 보지 않는다.
