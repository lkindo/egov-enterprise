# 유지보수자 인수인계 지도

이 문서는 이 저장소의 유지보수를 넘겨받는 사람이 **무엇을, 언제, 어디서** 봐야 하는지 한 장으로 잇는 지도다. 규칙과 절차를 다시 쓰지 않고 정본에 링크한다 — 정본이 바뀌면 이 문서가 아니라 정본을 따른다. 작성 근거는 2026-11-14 원점 평가의 유지보수 지적("결정 권한과 운영 지식이 한 사람에게 모여 있다")이다.

## 1. 결정 권한 — 지금은 한 사람이다

| 무엇 | 현재 | 정본 |
|---|---|---|
| 제품·IA·보안/개인정보 owner | 저장소 소유자 한 사람이 세 역할을 겸한다. 승인 채널은 PR 리뷰다 | [DEC-OPS-013](../archived/operational-decisions-history.md#dec-ops-013) |
| main 병합 리뷰 정책 | 단독 운영 기간이라 승인 0·code owner 비활성으로 동결했다. 사람이 늘면 이 결정부터 바꾼다 | [DEC-OPS-009](../archived/operational-decisions-history.md#dec-ops-009), [required checks](../../.github/required-checks.json) |
| 사람의 승인이 필요한 작업 | 대량 삭제, 운영·코어 데이터 변경, DB 스키마·인프라 변경, 외부 발행, 강제 push | [AGENTS.md 공통 작업 원칙](../../AGENTS.md#공통-작업-원칙) |
| 에이전트가 승인 없이 끝내는 범위 | 맡은 작업 브랜치의 PR·required CI·병합·브랜치 정리 | [AGENTS.md 공유 워킹트리와 Git](../../AGENTS.md#공유-워킹트리와-git) |
| 결정을 기다리는 항목 | 제품·운영 판단이 필요한 열린 결정 | [pending-decisions.md](pending-decisions.md) |

넘겨받는 사람이 둘 이상이면 먼저 정할 것: 세 owner 역할을 누구에게 나눌지, 리뷰 정책(DEC-OPS-009)을 승인 1 이상으로 올릴지, 공유 OCI DB 적용 승인을 누가 할지.

## 2. 정기적으로 도는 것

시각은 워크플로 cron(UTC)을 한국 시간으로 옮긴 값이다. 정본은 각 워크플로 파일이다.

| 주기(한국 시간) | 무엇 | 실패하면 | 정본 |
|---|---|---|---|
| 매일 06:17 | 재사용 생성물 야간 검증 — 시작 구성·레이아웃별 생성과 실제 DB 시험 | 생성물만 깨지는 결함(기능을 뺀 구성, 단일 모듈)의 첫 신호다. 원본 저장소 PR CI 가 고르지 않는 경로가 여기서 드러난다 | [reusable-nightly.yml](../../.github/workflows/reusable-nightly.yml), [CI 가이드 §재사용 생성물 야간 시험](../03-guides/cicd-pipeline.md#재사용-생성물-야간-시험t2) |
| 매주 월 09:00 | 거버넌스 검토 달력 — 검토 기한(reviewBy)이 지난 원장 보고 | 기술 CI 를 막지 않는 운영 보고다. 기한이 지난 항목을 다시 검토하거나 기한을 옮긴다 | [governance-review.yml](../../.github/workflows/governance-review.yml), [검토 수명 가이드](../03-guides/governance-review-lifecycle.md) |
| 매주 월 09:00 | 비밀값 이력 감사 | 이력에 비밀이 들어갔으면 값 교체가 먼저다 | [secret-scan-history.yml](../../.github/workflows/secret-scan-history.yml) |
| 매주 일요일 | Dependabot 갱신 PR(하나는 매월) | 벤더 DB 증거 입력(빌드 파일·드라이버)을 바꾸는 PR 은 따로 모아 증거를 다시 기록한다. 감사가 새 권고로 모든 PR 을 막을 수 있다 | [dependabot.yml](../../.github/dependabot.yml), [의존성 취약점 판정](dependabot-alert-census.md) |
| 매주 월 02:00~04:23 | 부하 시험(02:00)·NVD 의존성 검사(03:00)·이관 도구 독립 검증(03:23)·Lighthouse(04:00) | 권고 성격이다. NVD 검사가 갱신 단계에서 멈추면 API 키부터 본다 | [load-test.yml](../../.github/workflows/load-test.yml), [dependency-check.yml](../../.github/workflows/dependency-check.yml), [migration-tool.yml](../../.github/workflows/migration-tool.yml), [lighthouse.yml](../../.github/workflows/lighthouse.yml) |
| 매주 일 09:00 | OWASP ZAP 동적 검사 | 오탐 판별 절차가 있다 | [zap-scan.yml](../../.github/workflows/zap-scan.yml), [SAST 판정 기록](sast-findings-review.md) |

## 3. 일이 생길 때 하는 것

| 상황 | 할 일 | 정본 |
|---|---|---|
| 마이그레이션·엔티티·쿼리·빌드 파일을 바꾼다 | 여섯 DB 벤더의 인증 증거가 낡는다(`VENDOR_EVIDENCE_STALE`). 바꾼 것을 모아 한 번에 증거를 다시 기록한다(벤더마다 수십 분) | [다중 DB 설계 §7](../02-architecture/multi-database-composer-design.md#7-인증과-검증d-9-d-10), [벤더 원장](../../config/db-vendors.json) |
| 새 Flyway 마이그레이션을 공유 OCI DB 에 적용한다 | 적용마다 승인을 받고 결과를 적용 로그에 남긴다 | [shared-oci-migration-apply-log.md](shared-oci-migration-apply-log.md) |
| 게이트가 붉은데 원인을 모른다 | 검증 사각지대 런북의 판정 절차를 따른다. 로컬 훅은 빠른 피드백이고 병합 권위는 required CI 다 | [verification-blindspots.md](verification-blindspots.md), [.githooks/README.md](../../.githooks/README.md) |
| 비밀 키를 바꾼다(JWT·암호화·MFA) | 키 교체 절차와 백업을 따른다 — 잃으면 암호문을 읽지 못한다 | [crypto-key-rotation.md](crypto-key-rotation.md), [mfa-operations.md](mfa-operations.md) |
| 백업·복원 | 앱 중지 창의 한 세트(덤프·첨부·manifest)로 받고 훈련 도구로 복원을 확인한다 | [backup-and-restore-runbook.md](backup-and-restore-runbook.md) |
| 운영 배포 | 운영 오버레이와 배포 스크립트의 사전 검증을 지난다 | [docker-compose.prod.yml](../../docker-compose.prod.yml), [deploy.sh](../../scripts/deploy.sh) |
| 위험이 새로 보인다 | 재현할 수 있으면 gap 으로 남긴다. 추측은 남기지 않는다 | [known-gaps.md](../../.agent/memory/known-gaps.md), [gap 영역 상세](known-gaps-detail.md) |
| 결정을 내린다 | 아키텍처·제품 경계는 ADR, 앞으로의 작업을 제약하는 운영 규칙·승인은 DEC 로 남긴다 | [AGENTS.md Documentation and memory](../../AGENTS.md#documentation-and-memory), [ADR 색인](../02-architecture/decisions/README.md) |

## 4. 처음 맡았을 때 확인 순서

1. [AGENTS.md](../../AGENTS.md)와 공용 메모리 셋([project-context](../../.agent/memory/project-context.md)·[decisions](../../.agent/memory/decisions.md)·[known-gaps](../../.agent/memory/known-gaps.md))을 읽는다 — 무엇이 규칙이고 무엇이 파생 인덱스인지 구분된다.
2. 거버넌스 지도를 만든다: `npm run atlas:build` 뒤 `build/atlas/governance_harness_atlas.html` 을 연다([Atlas 가이드](../03-guides/governance-atlas-guide.md)).
3. 로컬 검증을 한 번 돈다: `npm run verify:fast`, 이어서 격리 E2E `npm run test:e2e:isolated`([E2E 가이드](../03-guides/e2e-test-guide.md)). 무거운 검증은 한 기계에서 하나씩 돈다([SOP §6.3](../03-guides/orchestration-protocol.md#63-무거운-검증은-하나씩)).
4. 최근 main CI·야간 검증 기록을 보고 붉은 것이 없는지, 열린 PR(특히 Dependabot)이 무엇을 기다리는지 본다.
5. [pending-decisions.md](pending-decisions.md)와 known-gaps 의 결정권자 열에서 내가 맡아야 할 판단을 고른다.

## 5. 한 사람 운영에서 오는 위험

- 리뷰 정책이 승인 0 이다 — 사람의 두 번째 눈은 PR 독립 검토(다른 회사 모델, [DEC-OPS-386](../archived/operational-decisions-history.md#dec-ops-386))와 required CI 뿐이다.
- 운영 비밀(키링·배포 자격·외부 서비스 키)의 보관 위치와 복구 수단을 둘 이상이 알고 있어야 한다. 값은 저장소에 두지 않는다.
- 이 문서가 낡으면 정본 링크가 깨진다 — 문서 링크 검사가 잡는다. 주기·담당이 바뀌면 이 표를 함께 고친다.
