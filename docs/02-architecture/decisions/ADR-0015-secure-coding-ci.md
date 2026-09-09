# ADR-0015: CI와 릴리스에 시큐어코딩 정적 분석 연결

- 상태: Accepted
- 결정일: 2026-09-09
- 근거: 사용자의 CI/CD 시큐어코딩 점검 도입 요청

## 배경

기존 `secret-scan`은 비밀정보·의존성·운영 계약을 검사하지만 범용 소스 SAST는 실행하지 않았다. 기존 인증·인가 하네스는 프로젝트의 명시적 보안 계약을 지키는 데 필요하며, 일반적인 주입·경로·암호 사용의 데이터 흐름 분석을 대신하지 않는다.

## 결정

공개 GitHub 저장소의 Java와 JavaScript/TypeScript를 CodeQL `security-extended`로 분석한다. 엔진은 [`sast-policy.json`](../../../config/security/sast-policy.json)에 고정하며, GitHub Actions는 커밋 SHA로 고정한다. Java는 5개 모듈의 production 컴파일을 추적하고, JavaScript/TypeScript는 [설정의 경로](../../../config/security/codeql.yml)를 분석한다.

`secure-coding`을 여섯 번째 required context로 정의한다. 코드·설정 변경의 두 언어 분석이 모두 성공해야 하며, 문서 전용 변경의 명시적 skip만 허용한다. 기존·신규 여부와 관계없이 보안 점수 7.0 이상을 차단하고 나머지는 리포트에 남긴다. 규칙 전체 제외나 baseline으로 기존 High를 일괄 숨기지 않는다. 분석·리포트·메타데이터 오류도 실패시킨다.

실제 취약/안전 fixture로 언어별 탐지와 동일 정책 CLI의 실패 종료 코드를 CI에서 확인한다. GitHub Security와 CI artifact에는 소스 내용·snippet·소스에서 유래한 메시지를 제거한 SARIF만 게시하고 CodeQL DB는 업로드하지 않는다. 운영 앱·OCI 연결 및 자격증명은 사용하지 않는다.

2026-09-09 사용자는 확실한 오탐의 예외 등록을 명시 승인했다. [7건의 재검토 결과](../../04-operations/sast-findings-review.md)에 따라 규칙·파일·행·fingerprint·소스/방어 해시·만료일에 결속한 예외만 허용한다. 승인 목록은 하네스 registry 동결에 포함한다. 감사 artifact에는 예외와 근거를 유지하고 GitHub 게시본에서는 승인된 개별 탐지만 제외한다. 신규 탐지와 변경·만료·건수 불일치는 실패하며 예외 재승인 없이 자동 갱신하지 않는다.

기존 release workflow는 required-check manifest를 읽으므로 새 체크의 성공 이력 없는 SHA를 발행하지 못한다. 원격 브랜치 보호는 저장소 파일만으로 적용되지 않으며 `verify:ops`의 실측으로 별도 확인한다.

## 영향과 한계

코드 변경 PR에 분석 시간이 추가된다. 로컬 훅은 계약 검사를 수행하고, 전체 CodeQL 분석은 로컬 명시 명령과 CI에서 수행한다. SAST green은 업무 권한·운영 설정·동적 공격의 완전한 검증을 뜻하지 않으므로 기존 테스트를 유지한다. 탐지는 소스·데이터 흐름·보완 방어로 검토하며 실제 위반은 수정 후 재분석한다.

실행 명령·실패 처리·리포트 보존은 [CI 가이드](../../03-guides/cicd-pipeline.md#시큐어코딩-정적-분석-sast), 실행과 차단은 [워크플로우](../../../.github/workflows/ci.yml)와 [정책 evaluator](../../../scripts/sast-policy.mjs)가 정본이다.
