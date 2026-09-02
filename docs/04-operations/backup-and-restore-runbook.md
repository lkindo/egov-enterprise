# 백업·복원 런북

> 이 문서는 **절차**다. 실제 백업이 존재하는지, 복원이 성공하는지는 저장소가 증명할 수 없다
> (GAP-OPS-002 `blocked-external`). 아래 절차를 승인된 격리 환경에서 실행하고 그 결과를
> 안전한 채널에 남긴 뒤에야 "백업이 있다"고 말할 수 있다.

## 1. 무엇을 백업하는가 — 세 가지는 한 세트다

이 시스템의 상태는 세 곳에 나뉘어 있고, **하나만 되돌리면 나머지와 어긋난다.**

| # | 대상 | 위치 | 어긋났을 때 나타나는 증상 |
|---|---|---|---|
| 1 | 데이터베이스 | compose volume `postgres_data` (PostgreSQL 17) | — |
| 2 | 첨부 파일 실물 | compose volume `attachment_storage` (`/app/storage/uploads`) | 화면은 첨부가 있다고 말하는데 다운로드만 실패한다 |
| 3 | 암호화 마스터 키 | `ALGORITHM_KEY` 환경변수 (저장소 밖) | 주민등록번호 등 PII 가 **영구히 읽히지 않는다** |

### 왜 셋이 한 세트인가

- **DB ↔ 첨부**: 첨부 레코드(`tb_atch_file_*`)는 DB 에, 실물은 파일 저장소에 있다. 한쪽만
  복원하면 관리자 첨부 정합성 점검(`GET /api/v1/admin/files/integrity`)이 대량 불일치를
  보고한다. 그 점검이 바로 이 상태를 탐지하도록 만들어져 있으므로, **복원 검증에 그대로 쓴다**.
- **DB ↔ 키**: 개인정보 컬럼은 `RrnoEncryptionConverter` 로 ALGORITHM_KEY 에 묶여 암호화돼
  저장된다. 백업 시점과 다른 키로 복원하면 암호문은 남지만 평문을 되찾을 수 없다.
  키 교체 중이라면 [crypto-key-rotation.md](crypto-key-rotation.md) 의 회전 창 규약을 함께 본다.

> **⚠ 2026-09-02 이전 배포에는 2번이 존재하지 않았다.** `api` 서비스에 volume 이 없어 첨부가
> 컨테이너 쓰기 계층에 쌓였고, 재배포로 컨테이너를 재생성할 때마다 전부 사라졌다. 그 시기의
> 백업은 DB 만 담고 있으므로 첨부는 복원할 대상 자체가 없다.

## 2. 백업 절차

아래는 compose 배포 기준이다. 관리형 DB(RDS 등)를 쓰면 1번은 그쪽 스냅샷으로 대체하되
**2·3번은 여전히 따로 챙겨야 한다**.

```bash
# 0) 백업 시각을 한 번만 정해 세 산출물에 같은 태그를 붙인다.
#    태그가 다르면 나중에 어느 DB 와 어느 첨부가 짝인지 알 수 없다.
STAMP=$(date -u +%Y%m%dT%H%M%SZ)

# 1) 데이터베이스 — 커스텀 포맷(-Fc)으로 받는다. 병렬 복원과 선택 복원이 가능하다.
docker compose exec -T db pg_dump -U egov -Fc egovdb > "backup-db-${STAMP}.dump"

# 2) 첨부 파일 실물 — named volume 을 tar 로 받는다.
docker run --rm \
  -v egov-enterprise_attachment_storage:/data:ro \
  -v "$PWD":/backup alpine \
  tar czf "/backup/backup-files-${STAMP}.tar.gz" -C /data .

# 3) 스키마 버전을 함께 기록한다. 복원 대상 애플리케이션 버전을 고르는 근거가 된다.
docker compose exec -T db psql -U egov -d egovdb -Atc \
  "SELECT version FROM flyway_schema_history WHERE success ORDER BY installed_rank DESC LIMIT 1" \
  > "backup-schema-version-${STAMP}.txt"
```

**키(3번)는 이 스크립트로 백업하지 않는다.** 비밀은 저장소·백업 아카이브가 아니라 조직의
비밀 관리 체계에 둔다. 여기에는 "어느 키 식별자로 암호화된 백업인가"만 기록한다.

## 3. 복원 절차

순서가 중요하다. **애플리케이션을 먼저 세우고 복원한다** — 기동 중인 앱이 있으면 Flyway 가
복원 중인 스키마에 개입하거나, 복원 직후의 불완전한 상태를 사용자가 본다.

```bash
# 1) 애플리케이션만 내린다(DB 는 살려 둔다).
docker compose stop api frontend

# 2) 데이터베이스 복원. --clean --if-exists 로 기존 객체를 먼저 지운다.
docker compose exec -T db pg_restore -U egov -d egovdb --clean --if-exists < "backup-db-${STAMP}.dump"

# 3) 첨부 파일 복원. 기존 잔여물을 지운 뒤 풀어야 백업 시점과 정확히 같아진다.
docker run --rm \
  -v egov-enterprise_attachment_storage:/data \
  -v "$PWD":/backup alpine \
  sh -c 'rm -rf /data/* && tar xzf /backup/backup-files-'"${STAMP}"'.tar.gz -C /data'

# 4) 백업과 같은 ALGORITHM_KEY 를 주입한 상태로 기동한다.
docker compose up -d api frontend
```

### 복원 직후 반드시 확인할 것

1. **기동 성공** — `docker compose ps` 에서 api 가 healthy. 실패하면 대개 Flyway 버전 불일치다
   (앱이 백업보다 낮은 스키마를 기대하면 기동을 거부한다). 2번에서 기록한 스키마 버전과
   같은 릴리스의 이미지를 쓴다.
2. **PII 복호화** — 관리자로 사용자 상세를 연다. 키가 어긋나면 여기서 드러난다.
   이 조회는 개인정보 접근 로그에 남으므로, 검증용 접근임을 운영 기록에 함께 남긴다.
3. **DB ↔ 첨부 정합** — 관리자 화면의 첨부 정합성 점검(모니터링 허브 OBSERVABILITY 탭,
   `GET /api/v1/admin/files/integrity`)을 실행한다. 실물 부재나 고아 후보가 백업 시점 대비
   늘었다면 2·3번의 짝이 맞지 않는 것이다.
4. **로그인** — 관리자 1계정으로 실제 로그인한다. 계정 잠금·로그인 정책이 복원됐는지 본다.

## 4. 주기·보존·RTO/RPO — **미결정**

이 문서는 절차만 정한다. 아래 값은 이 저장소가 정할 수 없다.

| 항목 | 상태 | 결정 주체 |
|---|---|---|
| 백업 주기 | 미결정 | 운영 관리자 |
| 보존 기간·세대 수 | 미결정 | 운영 관리자 |
| RTO(복구 목표 시간) | 미결정 | 사용자/운영 관리자 |
| RPO(허용 데이터 손실) | 미결정 | 사용자/운영 관리자 |
| 백업 보관 위치·암호화 | 미결정 | 보안 담당 |

**값을 지어내지 않는다.** 근거 없이 "일 1회, 30일 보존" 을 적으면 그 숫자가 합의된 목표처럼
읽히고, 실제 사고 때 아무도 그 값을 지키기로 한 적이 없다는 사실이 드러난다.
결정되면 [pending-decisions.md](pending-decisions.md) 를 거쳐 이 표를 채운다.

## 5. 정기 복원 훈련

백업은 **복원해 본 적이 있을 때만** 백업이다. 다음을 만족하는 훈련 기록이 없으면
GAP-OPS-002 는 계속 열려 있다.

- 운영과 격리된 환경에서 위 3장을 처음부터 끝까지 실행했다.
- 4장의 확인 4가지를 모두 통과했다.
- 소요 시간을 측정했고, 그 값이 합의된 RTO 안이다.
- 실행자·일시·백업 태그·결과를 안전한 채널에 남겼다(저장소에는 남기지 않는다).

## 관련 문서

- [crypto-key-rotation.md](crypto-key-rotation.md) — 암호화 마스터 키 회전. 회전 중 백업은 어느 키로
  복원되는지 반드시 확인한다.
- [verification-blindspots.md](verification-blindspots.md) — 저장소 CI 로 증명할 수 없는 축의 목록.
- [log-retention-policy.md](log-retention-policy.md) — 로그는 이 런북의 백업 대상이 아니다(별도 보존 정책).
