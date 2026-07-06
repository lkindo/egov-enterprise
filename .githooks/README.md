# .githooks — 공유 git 훅 (GEMINI.md §0.6 기계적 강제)

`GEMINI.md` §0.6의 컴파일 무결성 게이트와 §4의 계약 드리프트 점검을 prose 규칙에서 **기계적 강제**로 승격한다. Gemini·Claude 등 어떤 operator가 커밋/푸시하든 동일하게 적용된다.

## 설치 (클론마다 1회)
```sh
git config core.hooksPath .githooks
```
> `core.hooksPath`는 클론별 로컬 설정이라 커밋되지 않는다. 새 클론에서 한 번 실행한다.

## 동작
| 훅 | 시점 | 동작 | 강도 |
|----|------|------|------|
| `pre-commit` | 커밋 | DTO/Controller/api-docs.json/생성타입 스테이징 시 `codegen:verify(:zod)` 드리프트 점검 | ⚠ 경고(비차단) |
| `pre-push` | 푸시 | `./gradlew compileJava compileTestJava` + `npx tsc --noEmit` | ❌ 차단 |

## 우회
- 일시 우회: `git commit --no-verify` / `git push --no-verify`
- 세션 우회: `SKIP_HOOKS=1 git push`
- 완전 해제: `git config --unset core.hooksPath`

> pre-commit이 드리프트를 **경고만** 하는 이유: `api-docs.json` 자체가 stale이면 재생성이 오탐을 낳는다. 차단은 결정론적인 pre-push 컴파일 게이트에만 둔다.
