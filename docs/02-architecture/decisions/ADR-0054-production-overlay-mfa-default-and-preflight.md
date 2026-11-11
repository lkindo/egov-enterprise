# ADR-0054 — 운영 오버레이 보호계정 MFA 기본 강제·배포 전 키링 선검증과 스모크 경계

- 상태: Accepted
- 결정일: 2026-11-11
- 승인: 사용자가 프로젝트 품질 평가 후속 권고안 중 운영 오버레이 `MFA_REQUIRE_PROTECTED` 기본 `true` 상향 및 배포 사전 검증 권고안(#3)을 승인하고 구현·검증·리뷰 후 병합을 지시했다.
- 대체 범위: [ADR-0025](ADR-0025-enterprise-completeness-and-durable-operations.md) D11의 운영 배포 오버레이 기본 비활성(opt-in) 활성화 방식과 [DEC-OPS-412](../../archived/operational-decisions-history.md#dec-ops-412) ①의 운영 오버레이 기본값 `false` 유지 판단. 애플리케이션 템플릿 기본값(`false`), `MFA_RECOVER` 미배정 원칙, 복구·키 준비 선행 조건, 기관 도입 점검(`authorization`) 확인 의무는 유지한다.

## 배경

`application.yml`은 키링 없이 실행되는 로컬 개발(`npm run dev`), 격리 E2E, 재사용 프로젝트 초기 기동을 위해 `nuri.security.mfa.require-protected` 기본값을 `false`로 둔다. 종전에는 `docker-compose.prod.yml`도 기본값 없이 `MFA_REQUIRE_PROTECTED:`만 전달해 운영자가 변수를 따로 지정하지 않으면 운영 배포에서도 보호계정 MFA 의무가 꺼진 채 기동했다. 반대로 애플리케이션 기본값 자체를 `true`로 바꾸면 키 없는 개발·생성물 기동이 깨지고, 운영 오버레이만 `true`로 올리더라도 복구 준비 안내와 로컬 릴리스 스모크 경계를 함께 정리해야 한다.

## 결정

1. **애플리케이션 기본값(`false`)과 운영 오버레이 기본값(`true`)을 분리한다.** `application.yml`의 기본값 `false`는 그대로 유지한다. 반면 `docker-compose.prod.yml`의 `api.environment`는 `MFA_REQUIRE_PROTECTED: ${MFA_REQUIRE_PROTECTED:-true}`를 기본값으로 전달해, 명시적 유예 없이 운영 오버레이로 배포할 때 보호계정(`USER_PASSWORD`·`AUTHRT_GRANT`·`AUTHRT_ASSIGN` 보유자) MFA 등록 의무가 기본 적용되게 한다.
2. **`scripts/deploy.sh`는 셸 환경에서 불리언 값과 키링을 이미지 pull 전에 선검증한다.** `deploy.sh`는 `.env` 파일을 읽지 않고 export된 **셸 환경변수**만 소비한다. `MFA_REQUIRE_PROTECTED`(미지정 시 `true`)가 `true`·`false`(대소문자 무관) 외의 값이면 오타에 의한 조용한 비활성화를 막기 위해 즉시 중단한다. 유효값이 `true`일 때 `MFA_ACTIVE_KEY_ID` 또는 `MFA_KEYS_JSON`이 비어 있으면 `docker pull` 전에 배포를 중단하고, 복구 준비 전제 확인 또는 승인된 전환 유예(`export MFA_REQUIRE_PROTECTED=false`) 방법을 안내한다. `docker compose -f docker-compose.yml -f docker-compose.prod.yml`을 직접 실행하는 수동 경로에서는 셸 환경변수 또는 루트 `.env`로 값을 주입한다.
3. **ADR-0025 D11의 복구 준비 선행 조건과 기관 도입 확인 의무를 유지한다.** `MFA_RECOVER`는 기본 그룹에 자동 배정되지 않는다. 운영에서 기본값(`true`)으로 기동하는 기관은 배포 전에 `MFA_RECOVER` 담당·대체 담당 배정, 본인확인 절차, 암호화 키 백업, 복구코드 안전 보관을 먼저 갖춰야 한다(유일한 관리자가 기기·복구코드를 모두 분실했을 때 회복 경로가 끊기지 않도록 하기 위함). 준비 전 단계적 적용이 필요한 기관은 명시적으로 `MFA_REQUIRE_PROTECTED=false`를 지정해 전환 유예로 배포하고, 기관 도입 점검(`authorization` 통제) 근거에 유예 사유와 단계 적용 계획을 기록한다.
4. **격리 릴리스 스모크는 명시적 `MFA_REQUIRE_PROTECTED=false`로 실행 계획을 고정한다.** `scripts/run-isolated-release-smoke.mjs`는 MFA 키링과 관리자 TOTP 없이 이미지·네트워크·복원 경계를 검증하는 로컬 도구이므로 `api`·`bootstrap` 컨테이너 환경에 `MFA_REQUIRE_PROTECTED: 'false'`를 명시하고 `validateReleaseSmokePlan`이 그 값을 단언한다. 수동 운영 오버레이 리허설(클라이언트 IP 신뢰 경계 리허설 등)도 MFA 자체를 시험하지 않을 때는 `MFA_REQUIRE_PROTECTED=false`를 명시한다.

## 검증 경계

`ConfigSafetyLinterTest`가 `docker-compose.prod.yml`의 `${MFA_REQUIRE_PROTECTED:-true}` 기본값과 `scripts/deploy.sh`의 사전 키링·불리언·순서(`docker pull` 이전) 불변식을 부정 시험과 함께 고정한다. `scripts/e2e-isolation.test.mjs`가 `docker-compose.prod.yml`의 기본 `true` 렌더 입력에서도 릴리스 스모크 계획이 `false`로 고정되고 `true` 변조를 거부하는지 검증한다.
