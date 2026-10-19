# 백업·복원 런북

> 이 문서는 **절차와 템플릿 권장 시작값**이다. 실제 백업이 존재하는지, 복원이 성공하는지는 저장소가 증명할 수 없다 —
> 그 증거는 기관 승인 통제 `backup-recovery`의 몫이다([DEC-OPS-107](../archived/operational-decisions-history.md#dec-ops-107)로
> GAP-OPS-002에서 이전). 아래 절차를 승인된 격리 환경에서 실행하고 §5.3 양식으로 기록한 뒤에야 "백업이 있다"고 말할 수 있다.

> **지원 경계:** 현재 공식 Compose·`scripts/deploy.sh`·이 런북은 `db` 서비스로 함께 기동하는
> **번들 PostgreSQL 전용**이다. RDS 등 관리형 DB는 DB 단계만 임의로 건너뛰지 않는다. 그러면
> 첨부만 과거로 돌아가 DB와 어긋난다. 별도 Compose profile과 공급자별 snapshot/restore 절차가
> 승인되기 전에는 아래 스크립트가 외부 `DB_URL`을 fail-closed로 거부한다.

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

> **⚠ 최초 볼륨 전환은 일반 재배포가 아니다.** 2026-09-02 이전 형상은 `api` 서비스에 volume 이
> 없어 첨부가 현재 `egov-api` 컨테이너의 쓰기 계층에 있다. 그 컨테이너가 아직 남아 있다면 아래
> 절차로 반드시 회수할 수 있고, `scripts/deploy.sh`도 이관 완료 전 재생성을 거부한다. 반대로 과거
> 재배포에서 이미 제거된 컨테이너의 실물은 DB 백업만으로 복구할 수 없다.

### 최초 볼륨 전환 — 기존 컨테이너를 재생성하기 전에 1회 실행

이 절차는 기존 `egov-api`가 `/app/storage` volume을 아직 쓰지 않을 때만 실행한다. 먼저 승인된
점검 창을 열고 업로드·삭제 쓰기를 중지한다. **이관 검증이 끝나기 전에 `docker compose up`이나
`scripts/deploy.sh`를 실행하지 않는다.**

`scripts/deploy.sh`는 운영 배포와 clean-host 복원의 provenance를 일치시키기 위해
승인된 GitHub Release에서 받은 완성된 `release-manifest.json`을 인자로 요구한다(jq 필요).
manifest의 두 registry digest를 `API_IMAGE_REF`와 `FRONTEND_IMAGE_REF`로 주입하며,
기존 환경값이 있으면 manifest와 일치해야 한다. manifest는 서명이나 운영 배포 승인을 대신하지 않는다.
두 이미지는 동일한 `org.opencontainers.image.revision` label을 가져야 하며, 스크립트가 pull과
검증을 마친 뒤 `--no-build`로만 기동한다. 운영 호스트의 checkout에서 이미지를 즉석 빌드하지 않는다.

```bash
set -euo pipefail
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)
case "${DB_URL:-}" in
  (jdbc:postgresql://db:5432/egovdb|jdbc:postgresql://db:5432/egovdb\?*) ;;
  (*) echo "ERROR: 이 절차는 compose 번들 DB 전용입니다." >&2; exit 1 ;;
esac

# 1) 현재 컨테이너와 이번 배포가 사용할 실제 프로젝트명·볼륨명을 고정한다.
LEGACY_API=$(docker inspect egov-api --format '{{.Id}}')
LEGACY_IMAGE=$(docker inspect egov-api --format '{{.Image}}')
COMPOSE_PROJECT=$("${COMPOSE[@]}" config | awk '/^name:/ { print $2; exit }')
ATTACHMENT_VOLUME=$("${COMPOSE[@]}" config | awk '
  /^volumes:$/ { in_volumes=1; next }
  in_volumes && /^[^[:space:]]/ { exit }
  in_volumes && /^  attachment_storage:$/ { in_target=1; next }
  in_target && /^    name:/ {
    sub(/^    name:[[:space:]]*/, ""); gsub(/^\"|\"$/, ""); print; exit
  }
')
: "${COMPOSE_PROJECT:?compose 프로젝트명을 해석하지 못했습니다}"
: "${ATTACHMENT_VOLUME:?attachment_storage 볼륨명을 해석하지 못했습니다}"

CURRENT_VOLUME=$(docker inspect "$LEGACY_API" --format \
  '{{range .Mounts}}{{if eq .Destination "/app/storage"}}{{.Name}}{{end}}{{end}}')
if [ "$CURRENT_VOLUME" = "$ATTACHMENT_VOLUME" ]; then
  echo "이미 목표 attachment_storage 볼륨을 사용 중입니다. 이관하지 않습니다."
  exit 0
fi

# 2) 프런트와 API를 내려 DB와 첨부 실물이 더 바뀌지 않게 한 뒤, 쓰기 계층을 임시 경로로 회수한다.
MIGRATION_STOPPED=1
restart_legacy_on_failure() {
  rc=$?
  if [ "$rc" -ne 0 ] && [ "$MIGRATION_STOPPED" -eq 1 ]; then
    "${COMPOSE[@]}" start api frontend || \
      echo "ERROR: 기존 앱 자동 재기동에 실패했습니다. 운영자가 즉시 확인하십시오." >&2
  fi
  trap - EXIT
  exit "$rc"
}
trap restart_legacy_on_failure EXIT
"${COMPOSE[@]}" stop frontend api
MIGRATION_DIR=$(mktemp -d)
docker cp "${LEGACY_API}:/app/storage/." "${MIGRATION_DIR}/"

# 3) Compose가 쓸 정확한 이름과 표준 label로 볼륨을 만든다. 기존 대상이 있으면 비어 있어야 한다.
docker volume inspect "$ATTACHMENT_VOLUME" >/dev/null 2>&1 || \
  docker volume create \
    --label "com.docker.compose.project=${COMPOSE_PROJECT}" \
    --label "com.docker.compose.volume=attachment_storage" \
    "$ATTACHMENT_VOLUME"

if docker run --rm --network none --user 0:0 --entrypoint sh \
  -v "${ATTACHMENT_VOLUME}:/target" "$LEGACY_IMAGE" \
  -c 'find /target -mindepth 1 -print -quit | grep -q .'; then
  echo "ERROR: 목표 볼륨이 비어 있지 않습니다. 덮어쓰지 않았습니다." >&2
  exit 1
fi

# 4) 같은 로컬 이미지로 복사하고 파일 수와 내용 해시를 양쪽에서 독립 계산한다.
docker run --rm --network none --user 0:0 --entrypoint sh \
  -v "${MIGRATION_DIR}:/source:ro" -v "${ATTACHMENT_VOLUME}:/target" \
  "$LEGACY_IMAGE" -c 'cp -a /source/. /target/'

SOURCE_COUNT=$(docker run --rm --network none --user 0:0 --entrypoint sh \
  -v "${MIGRATION_DIR}:/data:ro" "$LEGACY_IMAGE" \
  -c 'find /data -type f | wc -l')
TARGET_COUNT=$(docker run --rm --network none --user 0:0 --entrypoint sh \
  -v "${ATTACHMENT_VOLUME}:/data:ro" "$LEGACY_IMAGE" \
  -c 'find /data -type f | wc -l')
SOURCE_HASH=$(docker run --rm --network none --user 0:0 --entrypoint sh \
  -v "${MIGRATION_DIR}:/data:ro" "$LEGACY_IMAGE" \
  -c 'cd /data && find . -type f -exec sha256sum {} \; | sort | sha256sum')
TARGET_HASH=$(docker run --rm --network none --user 0:0 --entrypoint sh \
  -v "${ATTACHMENT_VOLUME}:/data:ro" "$LEGACY_IMAGE" \
  -c 'cd /data && find . -type f -exec sha256sum {} \; | sort | sha256sum')
test "$SOURCE_COUNT" = "$TARGET_COUNT"
test "$SOURCE_HASH" = "$TARGET_HASH"

# 5) 검증에 성공한 경우에만 배포 가드가 읽는 marker를 만들고 앱 사용자 소유권을 맞춘다.
docker run --rm --network none --user 0:0 --entrypoint sh \
  -v "${ATTACHMENT_VOLUME}:/target" "$LEGACY_IMAGE" \
  -c 'touch /target/.egov-attachment-migration-v1 && \
      chown -R "$(id -u spring):$(id -g spring)" /target'
rm -rf -- "$MIGRATION_DIR"

# 6) 이제만 정상 배포한다. 완료 뒤 관리자 첨부 정합성 점검까지 통과해야 전환 완료다.
MIGRATION_STOPPED=0
trap - EXIT
./scripts/deploy.sh /secure/path/release-manifest.json
```

파일 수나 해시가 다르면 marker를 만들지 말고, 기존 컨테이너를 보존한 채 원인을 조사한다. 배포 후에는
`docker inspect egov-api`에서 `/app/storage`의 volume명이 위 `ATTACHMENT_VOLUME`과 같은지 확인하고,
관리자 첨부 정합성 점검(`GET /api/v1/admin/files/integrity`)에서 실물 부재가 늘지 않았는지 확인한다.

## 2. 백업 절차

아래 절차는 compose의 번들 PostgreSQL과 `attachment_storage`를 하나의 정합 시점으로 백업한다.
관리형 DB에서는 일부 단계만 대체하지 말고 이 절차를 중단한다. 공급자 snapshot과 첨부 쓰기 중지를
같은 시점에 결속하는 별도 승인 런북이 마련돼야 한다.

```bash
# 0) 백업 시각을 한 번만 정하고, 완성 전 파일은 최종 백업 디렉터리에서 격리한다.
set -euo pipefail
umask 077
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)
case "${DB_URL:-}" in
  (jdbc:postgresql://db:5432/egovdb|jdbc:postgresql://db:5432/egovdb\?*) ;;
  (*) echo "ERROR: 이 절차는 compose 번들 DB 전용입니다." >&2; exit 1 ;;
esac
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_DIR="backup-${STAMP}"
test ! -e "$BACKUP_DIR"
BACKUP_TMP=$(mktemp -d ".backup-${STAMP}.tmp.XXXXXX")
APP_STOPPED=0

cleanup_backup() {
  rc=$?
  if [ "$APP_STOPPED" -eq 1 ]; then
    "${COMPOSE[@]}" start api frontend || \
      echo "ERROR: 앱 자동 재기동에 실패했습니다. 운영자가 즉시 확인하십시오." >&2
  fi
  if [ -n "${BACKUP_TMP:-}" ] && [ -d "$BACKUP_TMP" ]; then
    rm -rf -- "$BACKUP_TMP"
  fi
  trap - EXIT
  exit "$rc"
}
trap cleanup_backup EXIT

# Compose 프로젝트명은 배포 디렉터리·COMPOSE_PROJECT_NAME에 따라 달라진다.
# config가 정규화한 실제 attachment_storage 볼륨명을 사용한다.
resolve_attachment_volume() {
  "${COMPOSE[@]}" config | awk '
    /^volumes:$/ { in_volumes = 1; next }
    in_volumes && /^[^[:space:]]/ { exit }
    in_volumes && /^  attachment_storage:$/ { in_target = 1; next }
    in_target && /^    name:/ {
      sub(/^    name:[[:space:]]*/, "")
      gsub(/^[" ]|[" ]$/, "")
      print
      exit
    }
    in_target && /^  [^[:space:]]/ { exit }
  '
}
ATTACHMENT_VOLUME=$(resolve_attachment_volume)
: "${ATTACHMENT_VOLUME:?compose 형상에서 attachment_storage 볼륨명을 찾을 수 없습니다}"

# 백업만으로 깨끗한 호스트를 복구하려면 로컬 image ID가 아니라 registry에서 다시 pull할 수
# 있는 immutable digest가 필요하다. 두 이미지는 같은 비어 있지 않은 release revision label을
# 가져야 한다. 예: registry.example/egov/api@sha256:<64 lowercase hex>
: "${API_IMAGE_REF:?pull 가능한 digest 고정 API 이미지 reference를 설정하십시오}"
: "${FRONTEND_IMAGE_REF:?pull 가능한 digest 고정 frontend 이미지 reference를 설정하십시오}"
for ref in "$API_IMAGE_REF" "$FRONTEND_IMAGE_REF"; do
  printf '%s\n' "$ref" | grep -Eq '^[^[:space:]@]+@sha256:[0-9a-f]{64}$' || {
    echo "ERROR: image reference는 tag가 아닌 registry digest로 고정해야 합니다: $ref" >&2
    exit 1
  }
  docker pull "$ref"
done

# 실행 중인 release와 공개된 immutable 이미지가 실제로 같은 image인지 확인한다.
API_CONTAINER=$("${COMPOSE[@]}" ps -aq api)
: "${API_CONTAINER:?api 컨테이너를 찾을 수 없습니다}"
FRONTEND_CONTAINER=$("${COMPOSE[@]}" ps -aq frontend)
: "${FRONTEND_CONTAINER:?frontend 컨테이너를 찾을 수 없습니다}"
test "$(docker inspect "$API_CONTAINER" --format '{{.Image}}')" = \
  "$(docker image inspect "$API_IMAGE_REF" --format '{{.Id}}')"
test "$(docker inspect "$FRONTEND_CONTAINER" --format '{{.Image}}')" = \
  "$(docker image inspect "$FRONTEND_IMAGE_REF" --format '{{.Id}}')"
CURRENT_ATTACHMENT_VOLUME=$(docker inspect "$API_CONTAINER" \
  --format '{{range .Mounts}}{{if eq .Destination "/app/storage"}}{{.Name}}{{end}}{{end}}')
: "${CURRENT_ATTACHMENT_VOLUME:?api의 /app/storage named volume을 찾을 수 없습니다}"
test "$CURRENT_ATTACHMENT_VOLUME" = "$ATTACHMENT_VOLUME"
API_RELEASE_REVISION=$(docker image inspect "$API_IMAGE_REF" \
  --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')
FRONTEND_RELEASE_REVISION=$(docker image inspect "$FRONTEND_IMAGE_REF" \
  --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')
printf '%s\n' "$API_RELEASE_REVISION" | grep -Eq '^([0-9a-f]{40}|[0-9a-f]{64})$'
test "$API_RELEASE_REVISION" = "$FRONTEND_RELEASE_REVISION"

# 백업에 쓰는 Compose 형상도 release revision의 clean checkout에 결속한다.
CHECKOUT_REVISION=$(git rev-parse HEAD)
test "$CHECKOUT_REVISION" = "$API_RELEASE_REVISION"
test -z "$(git status --porcelain --untracked-files=no -- \
  docker-compose.yml docker-compose.prod.yml)"
COMPOSE_BASE_SHA256=$(sha256sum docker-compose.yml | awk '{print $1}')
COMPOSE_PROD_SHA256=$(sha256sum docker-compose.prod.yml | awk '{print $1}')

# 1) DB와 첨부 사이에 쓰기가 끼지 않도록 프런트와 API를 먼저 중지한다(DB는 유지).
APP_STOPPED=1
"${COMPOSE[@]}" stop frontend api

# 2) 데이터베이스 — 커스텀 포맷(-Fc)으로 받는다. 병렬 복원과 선택 복원이 가능하다.
"${COMPOSE[@]}" exec -T db sh -c \
  'exec pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > "$BACKUP_TMP/db.dump"

# 3) 첨부 파일 실물 — tar는 stdout으로 받아 호스트의 umask 077을 그대로 적용한다.
docker run --rm --network none --user 0:0 --entrypoint sh \
  -v "${ATTACHMENT_VOLUME}:/data:ro" "$API_IMAGE_REF" \
  -c 'tar czf - -C /data .' > "$BACKUP_TMP/files.tar.gz"

# 4) 스키마 버전, 비밀값이 아닌 키 식별자, 표마다의 행 수를 함께 기록한다.
#    ALGORITHM_KEY_ID는 KMS/비밀관리자의 key-id 또는 version이며 실제 ALGORITHM_KEY가 아니다.
#    반복 마이그레이션(R__)의 이력 행은 version이 NULL이라 버전 질의에서 뺀다 — 마지막 배포가 R__를 다시
#    적용했으면 빼지 않은 질의는 빈 줄을 기록한다.
#    행 수는 복원(§3)과 복원 훈련(§5.1)이 복원의 완전성을 대조하는 기준이다. 앱을 멈춘 뒤라 덤프와 같은 상태다.
: "${ALGORITHM_KEY_ID:?현재 ALGORITHM_KEY의 비밀이 아닌 key-id/version을 설정하십시오}"
"${COMPOSE[@]}" exec -T db sh -c \
  'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc \
  "SELECT version FROM flyway_schema_history WHERE success AND version IS NOT NULL ORDER BY installed_rank DESC LIMIT 1"' \
  > "$BACKUP_TMP/schema-version.txt"
test -s "$BACKUP_TMP/schema-version.txt"
"${COMPOSE[@]}" exec -T db sh -c \
  'exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At' \
  > "$BACKUP_TMP/table-counts.tsv" <<'TABLE_COUNTS_SQL'
SELECT table_name || E'\t' || (xpath('/row/c/text()', query_to_xml(
         format('SELECT count(*) AS c FROM %I.%I', table_schema, table_name), false, true, '')))[1]::text
  FROM information_schema.tables
 WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
 ORDER BY table_name;
TABLE_COUNTS_SQL

# 5) 같은 백업 세트임을 증명할 manifest와 checksum을 만든다. 키 원문은 어느 파일에도 쓰지 않는다.
{
  printf 'stamp=%s\n' "$STAMP"
  printf 'algorithm_key_id=%s\n' "$ALGORITHM_KEY_ID"
  printf 'api_image_ref=%s\n' "$API_IMAGE_REF"
  printf 'frontend_image_ref=%s\n' "$FRONTEND_IMAGE_REF"
  printf 'release_revision=%s\n' "$API_RELEASE_REVISION"
  printf 'compose_base_sha256=%s\n' "$COMPOSE_BASE_SHA256"
  printf 'compose_prod_sha256=%s\n' "$COMPOSE_PROD_SHA256"
} > "$BACKUP_TMP/manifest.txt"
(
  cd "$BACKUP_TMP"
  sha256sum db.dump files.tar.gz schema-version.txt manifest.txt table-counts.tsv > sha256.txt
  sha256sum -c sha256.txt
)

# 6) 검증된 디렉터리만 원자적으로 승격하고, 성공·실패 모두 trap에서 앱을 다시 시작한다.
mv "$BACKUP_TMP" "$BACKUP_DIR"
BACKUP_TMP=
"${COMPOSE[@]}" start api frontend
APP_STOPPED=0
trap - EXIT
```

**키 원문은 이 절차로 백업하지 않는다.** 비밀은 저장소·백업 아카이브가 아니라 조직의 비밀 관리
체계에 둔다. `backup-*/manifest.txt`에는 그 체계의 비밀이 아닌 key-id/version만 기록해 어느
키로 복원해야 하는지를 결속한다. manifest의 release revision과 두 Compose SHA-256도 실행 중인
이미지와 백업 당시 clean checkout을 함께 고정한다. 중간 명령이 실패하면 trap이 앱을 다시 시작하고
임시 디렉터리를 제거한다. 최종 `backup-*` 디렉터리는 모든 파일과 checksum 검증이 끝난 경우에만 나타난다.

## 3. 복원 절차

순서가 중요하다. **애플리케이션을 먼저 내리고 복원한다** — 기동 중인 앱이 있으면 Flyway 가
복원 중인 스키마에 개입하거나, 복원 직후의 불완전한 상태를 사용자가 본다.

```bash
# 0) 복원할 백업 태그를 명시한다. 기존 컨테이너가 전혀 없는 깨끗한 호스트도 지원한다.
set -euo pipefail
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)
case "${DB_URL:-}" in
  (jdbc:postgresql://db:5432/egovdb|jdbc:postgresql://db:5432/egovdb\?*) ;;
  (*) echo "ERROR: 이 절차는 compose 번들 DB 전용입니다." >&2; exit 1 ;;
esac
STAMP=YYYYMMDDThhmmssZ
case "$STAMP" in
  (""|*[!0-9TZ]*) echo "ERROR: STAMP 형식이 올바르지 않습니다." >&2; exit 1 ;;
esac
: "${ALGORITHM_KEY_ID:?복원에 주입할 키의 비밀이 아닌 key-id/version을 설정하십시오}"
BACKUP_DIR="backup-${STAMP}"

# 1) 기존 상태를 지우기 전에 백업 세트의 존재·checksum·형식을 모두 검증한다.
for file in db.dump files.tar.gz schema-version.txt manifest.txt table-counts.tsv sha256.txt; do
  file="$BACKUP_DIR/$file"
  test -s "$file"
done
(
  cd "$BACKUP_DIR"
  sha256sum -c sha256.txt
)
grep -Fqx -- "stamp=${STAMP}" "$BACKUP_DIR/manifest.txt"
grep -Fqx -- "algorithm_key_id=${ALGORITHM_KEY_ID}" "$BACKUP_DIR/manifest.txt"

manifest_value() {
  key=$1
  test "$(grep -c "^${key}=" "$BACKUP_DIR/manifest.txt")" -eq 1
  sed -n "s/^${key}=//p" "$BACKUP_DIR/manifest.txt"
}
API_IMAGE_REF=$(manifest_value api_image_ref)
FRONTEND_IMAGE_REF=$(manifest_value frontend_image_ref)
RELEASE_REVISION=$(manifest_value release_revision)
COMPOSE_BASE_SHA256=$(manifest_value compose_base_sha256)
COMPOSE_PROD_SHA256=$(manifest_value compose_prod_sha256)
export API_IMAGE_REF FRONTEND_IMAGE_REF
for ref in "$API_IMAGE_REF" "$FRONTEND_IMAGE_REF"; do
  printf '%s\n' "$ref" | grep -Eq '^[^[:space:]@]+@sha256:[0-9a-f]{64}$'
  docker pull "$ref"
done
printf '%s\n' "$RELEASE_REVISION" | grep -Eq '^([0-9a-f]{40}|[0-9a-f]{64})$'
printf '%s\n' "$COMPOSE_BASE_SHA256" | grep -Eq '^[0-9a-f]{64}$'
printf '%s\n' "$COMPOSE_PROD_SHA256" | grep -Eq '^[0-9a-f]{64}$'
test "$(git rev-parse HEAD)" = "$RELEASE_REVISION"
test -z "$(git status --porcelain --untracked-files=no -- \
  docker-compose.yml docker-compose.prod.yml)"
test "$(sha256sum docker-compose.yml | awk '{print $1}')" = "$COMPOSE_BASE_SHA256"
test "$(sha256sum docker-compose.prod.yml | awk '{print $1}')" = "$COMPOSE_PROD_SHA256"
test "$(docker image inspect "$API_IMAGE_REF" \
  --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')" = "$RELEASE_REVISION"
test "$(docker image inspect "$FRONTEND_IMAGE_REF" \
  --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')" = "$RELEASE_REVISION"

resolve_attachment_volume() {
  "${COMPOSE[@]}" config | awk '
    /^volumes:$/ { in_volumes = 1; next }
    in_volumes && /^[^[:space:]]/ { exit }
    in_volumes && /^  attachment_storage:$/ { in_target = 1; next }
    in_target && /^    name:/ {
      sub(/^    name:[[:space:]]*/, "")
      gsub(/^[" ]|[" ]$/, "")
      print
      exit
    }
    in_target && /^  [^[:space:]]/ { exit }
  '
}
ATTACHMENT_VOLUME=$(resolve_attachment_volume)
: "${ATTACHMENT_VOLUME:?compose 형상에서 attachment_storage 볼륨명을 찾을 수 없습니다}"
docker volume inspect "$ATTACHMENT_VOLUME" >/dev/null 2>&1 || \
  docker volume create "$ATTACHMENT_VOLUME" >/dev/null

# pg_restore와 tar 자체의 목록 읽기만 수행하며 기존 DB/볼륨에는 아직 쓰지 않는다.
"${COMPOSE[@]}" run --rm --no-deps -T db pg_restore --list \
  < "$BACKUP_DIR/db.dump" >/dev/null
docker run --rm --network none -i --entrypoint sh "$API_IMAGE_REF" \
  -c 'tar tzf - >/dev/null' < "$BACKUP_DIR/files.tar.gz"

# 2) 애플리케이션만 내린다(DB 는 살려 둔다).
"${COMPOSE[@]}" stop frontend api

# 3) 백업 이후 생긴 객체가 남지 않도록 대상 DB를 새로 만든 뒤 복원한다.
#    이 단계는 대상 DB 전체를 교체하므로 승인된 점검 창과 직전 백업이 필수다.
#    --exit-on-error 는 첫 오류에서 멈춘다. 없으면 나머지를 계속 복원한 뒤에야 실패를 알린다.
"${COMPOSE[@]}" up -d --wait db
"${COMPOSE[@]}" exec -T db sh -c \
  'dropdb -U "$POSTGRES_USER" --maintenance-db=postgres --if-exists --force "$POSTGRES_DB" && \
   createdb -U "$POSTGRES_USER" --maintenance-db=postgres --owner="$POSTGRES_USER" --template=template0 "$POSTGRES_DB" && \
   exec pg_restore --exit-on-error --no-owner --no-acl -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  < "$BACKUP_DIR/db.dump"

# 3-1) 앱을 띄우기 전에 표마다의 행 수가 백업 시점 기록과 같은지 본다. 앱이 뜨면 로그인·정기 작업이 행을 바꾼다.
#      다르면 diff 가 다른 줄을 보이고 여기서 멈춘다(앱은 아직 내려가 있다).
RESTORED_COUNTS=$("${COMPOSE[@]}" exec -T db sh -c \
  'exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At' <<'TABLE_COUNTS_SQL'
SELECT table_name || E'\t' || (xpath('/row/c/text()', query_to_xml(
         format('SELECT count(*) AS c FROM %I.%I', table_schema, table_name), false, true, '')))[1]::text
  FROM information_schema.tables
 WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
 ORDER BY table_name;
TABLE_COUNTS_SQL
)
diff "$BACKUP_DIR/table-counts.tsv" <(printf '%s\n' "$RESTORED_COUNTS")

# 4) 첨부 파일 복원. 확정한 단일 볼륨의 기존 내용(숨김 파일 포함)을 지운 뒤 푼다.
docker run --rm --network none --user 0:0 --entrypoint sh \
  -v "${ATTACHMENT_VOLUME}:/data" -i "$API_IMAGE_REF" \
  -c 'find /data -mindepth 1 -maxdepth 1 -exec rm -rf -- {} + && \
      tar xzf - -C /data && chown -R "$(id -u spring):$(id -g spring)" /data' \
  < "$BACKUP_DIR/files.tar.gz"

# 5) manifest와 같은 ALGORITHM_KEY 및 digest 고정 release 이미지만 사용해 기동한다.
#    --no-build는 깨끗한 호스트의 임의 checkout에서 다른 이미지를 만드는 경로를 차단한다.
"${COMPOSE[@]}" up -d --no-build api frontend
```

### 복원 직후 반드시 확인할 것

1. **기동 성공** — `"${COMPOSE[@]}" ps`에서 api가 healthy. 실패하면 대개 Flyway 버전 불일치다
   (앱이 백업보다 낮은 스키마를 기대하면 기동을 거부한다). 2번에서 기록한 스키마 버전과
   같은 릴리스의 이미지를 쓴다.
2. **PII 복호화** — 관리자로 사용자 상세를 연다. 키가 어긋나면 여기서 드러난다.
   이 조회는 개인정보 접근 로그에 남으므로, 검증용 접근임을 운영 기록에 함께 남긴다.
3. **DB ↔ 첨부 정합** — 관리자 화면의 첨부 정합성 점검(모니터링 허브 OBSERVABILITY 탭,
   `GET /api/v1/admin/files/integrity`)을 실행한다. 실물 부재나 고아 후보가 백업 시점 대비
   늘었다면 2·3번의 짝이 맞지 않는 것이다.
4. **로그인** — 관리자 1계정으로 실제 로그인한다. 계정 잠금·로그인 정책이 복원됐는지 본다.

## 격리 복원 자동 검증

`./gradlew :api-server:schemaValidationTest --tests '*BackupRestoreDrillIntegrationTest'`는
운영 접속정보를 읽지 않고 독립 PostgreSQL 17 컨테이너 두 개를 만든다. 전체 Flyway 적용 DB의
`pg_dump` → `pg_restore`, 첨부 archive 복원, 동일 ARIA 키 복호화·다른 키 거부를 검사한다.
테이블별 행수·첨부 참조·실물 내용·미검증 제약도 대조한다. 복원본에 감사 원장 수정 금지 트리거(V2_132) 3개가
활성으로 남고 권한 변경 이력의 수정이 거부되는지도 본다. 실행 시간과 범위는
`api-server/build/reports/restore-drill/result.json`에 남고 원시 dump는 임시 경로에서 정리한다.
이 시험은 CI가 합성 데이터로 만든 덤프의 왕복을 본다. 실제 백업 세트를 복원해 보는 것은 §5.1의 훈련 도구다.

2026-09-09 Flyway 2.96 시점 재실행은 82개 테이블(이력 테이블 포함)·17,188행을 대조했고, 백업 0.498초,
복원·검증 1.266초, 백업 시점 대비 누락 0행이었다. 이는 합성 데이터의 구성 요소 복구 검증이다.
운영 백업 존재, 앱 이미지·권한·외부 DB·네트워크 복구 시간이나 운영 RTO/RPO를 증명하지 않는다.

별도의 [`run-isolated-release-smoke.mjs`](../../scripts/run-isolated-release-smoke.mjs)는 로컬의 정확한 API/frontend 이미지 ID와 현재 소스 해시를 검사하고, `prod` API·frontend·edge를 통해 합성 첨부를 올린 뒤 소유한 tmpfs PostgreSQL과 전용 첨부 볼륨을 백업한다. 두 번째 새 DB·볼륨에 `pg_restore`·첨부 tar를 복원하고 동일 이미지의 로그인·세션·첨부 다운로드를 재검사한다. 성공 시에만 두 이미지 ID, source hash와 dirty 여부, 백업 해시, 범위·시간을 임시 `result.json`에 기록한다. 실행 명령과 이미지 준비 계약은 [CI 가이드](../03-guides/cicd-pipeline.md#릴리스-프런트엔드-런타임-인계)에 있다.

기본 실행은 동일 버전 이미지와 합성 데이터의 설치·복구 경로다. 과거 릴리스 비교는 같은 실행기의 아래 모드로 수행한다. 폐기용 `e2e` bootstrap의 cutover 증거를 운영 승인·백업 원장으로 사용하지 않으며, 실제 운영 백업·보존·RTO/RPO는 아래 결정 경계를 따른다.

### 이전 릴리스 → 현재 코드 → 이전 릴리스

[`historical-release-fixture.mjs`](../../scripts/historical-release-fixture.mjs)는 `v0.1.0`의 커밋
`fa2a79386734671b90166e33ec355e4784715773`과 생산 입력 1,391개의 해시, versioned SQL 85개와 repeatable 3개의 원본 바이트를 고정한다.
현재 SQL에 target `2.84`만 지정하지 않는다. Git archive는 `core.autocrlf=false`·`core.eol=lf`로 생성하며
당시 Dockerfile을 수정하지 않고 두 이미지를 빌드한다. 실제 구 API JAR에 들어간 SQL 88개의 해시도 기동 전에 원본과 비교한다.

환경 파일이 없는 별도 worktree에서 무거운 실행을 하나씩 수행한다. 이미지 빌드 결과의 실제 ID를 다음 명령에 전달한다.

```powershell
node scripts/run-isolated-release-smoke.mjs --build-current-images
node scripts/run-isolated-release-smoke.mjs --build-historical-images
node scripts/run-isolated-release-smoke.mjs --api-image sha256:<current-api-id> --frontend-image sha256:<current-frontend-id> --historical-api-image sha256:<old-api-id> --historical-frontend-image sha256:<old-frontend-id>
```

실행기는 소유 라벨·실제 container ID·image ID·DB명·내부 네트워크·mount를 쓰기 전에 확인한다.
세 DB는 각각 새 tmpfs PostgreSQL이며 호스트 포트를 공개하지 않는다. 원본 구 이미지에는 storage 디렉터리 준비가 없어,
이미지에서 조회한 비관리자 UID/GID로 **이 실행의 전용 첨부 볼륨만** 초기화한다. 이 보완은 구 이미지 수정이나 운영 볼륨 변경이 아니다.

구 production API로 합성 사용자 2개·개인 주소록과 구성원·첨부를 만든다. 실제 JAR의 ARIA converter로 만든 합성 암호문을 구 `rrno`에 저장하고,
owner/타인/익명/관리자 권한과 다운로드 해시·첨부 연결·동일 키 복호화·잘못된 키 거부를 확인한다.
writer를 중지한 **업그레이드 전 DB dump와 첨부 tar 한 세트**를 복구 지점으로 삼는다. 백업 뒤의 합성 변경 1건은 복원 결과에서 제외돼야 한다.

현재 이미지의 폐기용 bootstrap이 [권한 전환 절차](authorization-cutover-runbook.md)의 Contract를 적용한 뒤 production 앱을 기동한다.
업무 값·첨부·핵심 PK/unique/FK·권한을 비교하고, `rrno`→`user_enrrno`의 암호문 바이트와 실제 packaged converter를 확인한다.
구 버전 복원은 같은 업그레이드 전 백업과 원본 구 이미지로 별도의 새 DB·볼륨에서 수행한다. 앱 기동 전에 모든 테이블 행수와 제약 정의를 비교하고
주요 API·첨부·암호화를 다시 확인한다. 현재 스키마 위에 구 JAR만 띄우는 downgrade는 이 절차에 포함되지 않는다.

제약은 이름까지 전수 비교한다. `pg_get_constraintdef`는 원래 DDL이 아니라 재구성한 표현이며,
dump를 재해석할 때 `varchar` 리터럴 배열 전체의 `text[]` cast가 각 리터럴의 `text` cast로 바뀔 수 있다.
실행기는 관측한 단순 `열::text = ANY(동일 varchar 리터럴 배열)` CHECK의 이 변환만 허용하고,
키·열·연산자·리터럴·순서·검증 상태 변경과 다른 표현은 거부한다. 원래·복원한 정의의 해시와
정규화 건수도 각각 기록하며, 열의 타입·길이·기본값·collation은 별도로 비교한다.
근거는 [PostgreSQL의 함수 정의](https://www.postgresql.org/docs/17/functions-info.html)와
[동일한 dump 재해석 사례](https://www.postgresql.org/message-id/1fa24f41862f214b44bcf94556db51c9946d28bd.camel@cybertec.at)다.
기존 계약 테스트는 값·이름·타입·collation·연산·`NOT VALID` 변경을 red로 확인한다.

열은 이름·상대 순서와 다른 메타데이터를 전수 비교한다. 삭제한 열의 물리적 번호 간격은
논리 백업에 포함되지 않으므로 visible column의 상대 위치로 비교하며, 원래·복원한 물리 메타데이터
해시와 번호 변경 건수도 남긴다. 타입·nullable·default·identity·generated·collation 변경은 허용하지 않는다.
이 경계는 [PostgreSQL의 dropped column 설명](https://www.postgresql.org/docs/17/catalog-pg-attribute.html)과
[`ordinal_position`의 실제 정의](https://github.com/postgres/postgres/blob/REL_17_STABLE/src/backend/catalog/information_schema.sql)를 따른다.

전 단계와 정확한 소유 자원 정리가 성공해야 `.agent/temp/egov-release-smoke-*/result.json`을 남긴다.
이 결과에는 source/image/SQL/실행기 해시, 백업 지점, 업그레이드·복원과 API 검증에 걸린 시간, 누락 여부와 잔여 자원 수를 기록한다.
dump·키·쿠키·사용자 값은 공개 결과에 넣지 않는다. 측정 시간은 작은 합성 데이터의 로컬 관측이며 승인된 운영 RTO/RPO가 아니다.

2026-10-01 실제 실행은 생산 입력 해시 `d8ba32407cac3c9c28709db747c95cffe88b0bd868169255c99e625e5a5e6baf`의
개선 코드와 원본 `v0.1.0` 이미지를 사용했다. writer 중지 후 복구 지점은 `2026-10-01T10:13:59.308Z`이며,
업그레이드·API 검증 110.616초, 구 버전 복원·API 검증 71.624초, 전체 282.841초였다.
롤백 DB의 84개 테이블 행수·940개 열·220개 제약을 비교했고 백업 시점 대비 누락 0행, 전용 runtime 잔여 자원 0개였다.
57개 CHECK 표기와 367개 물리적 열 번호 변경을 위의 좁은 규칙으로 비교했으며 그 외 차이는 0건이다.
합성 업무 값·첨부·권한·암호화와 encoded HTTP 경계도 통과했다. 이 실행은 우선순위 4 구현 시점의 로컬 증거이며,
이후 화면 변경의 검증이나 운영 복구 승인으로 확대하지 않는다. 원본 bounded 결과는
`.agent/temp/egov-release-smoke-7DH3Tt/result.json`, 로컬 검토용 사본은 `build/goal-evidence/green/historical-upgrade-rollback.json`이다.

## 4. 주기·보존·RTO/RPO — 템플릿 권장 시작값

이 절의 값은 **기관이 바꿔 쓰는 시작값**이다. 합의된 목표가 아니다. 기관이 자기 데이터 규모·업무 중요도·인프라로
값을 정하고 결정 주체와 함께 `backup-recovery` 근거 파일(§5.3)에 기록해야 목표가 된다. 그래서 값마다 근거와
바꿀 때 보는 기준을 함께 적는다 — 근거 없이 숫자만 옮기면 그 숫자가 합의된 목표처럼 읽히고, 실제 사고 때
아무도 그 값을 지키기로 한 적이 없다는 사실이 드러난다.

### 4.1 저장소가 주는 것과 비어 있는 것

| 영역 | 저장소가 주는 것 | 비어 있는 것(기관 몫) |
|---|---|---|
| DB·첨부 백업 | §2 절차 — 앱을 멈춘 한 시점에 `pg_dump -Fc`·첨부 볼륨 tar·manifest·스키마 버전·행 수·SHA-256 을 한 세트로 받는다 | 실행 일정(cron 등)·성공 감시·보관 위치·백업 파일 암호화 |
| 암호화 키 | manifest 에 비밀이 아닌 key-id 만 결속한다 | 키 자체의 보관·복구(비밀 관리 체계) |
| 복원 | §3 절차(번들 PostgreSQL 전용, 외부 `DB_URL` 은 거부) | 관리형 DB·스토리지 스냅숏 절차 |
| 복구 검증 | §3 의 행 수 대조와 확인 4가지, §5.1 훈련 도구, CI 의 합성 복구 시험과 릴리스 복구 smoke(위 "격리 복원 자동 검증") | 운영 규모 훈련 기록과 실측 시간 |
| 마이그레이션·이관 전 백업 | [이관 런북](migration-recovery-runbook.md)·[인가 전환 런북](authorization-cutover-runbook.md)이 직전 백업 세트를 전제로 한다 | 그 백업의 실행·기록 |
| PITR(WAL 보관) | 없다 — compose 의 PostgreSQL 에 `archive_mode` 설정이 없고 §3 은 덤프 복원만 다룬다 | 필요하면 보관소·복원 런북과 함께 설계·승인 |
| 주기·보존·RTO/RPO | 아래 4.2 시작값 | 실제 값의 결정·승인 |

### 4.2 권장 시작값

전제: 번들 PostgreSQL 한 대와 첨부 볼륨이 한 호스트에 있고, 덤프가 수십 GB 이하이며, 업무시간에 운영하고
야간에 몇 분 멈춰도 되는 내부 업무 시스템이다. 전제가 다르면 값보다 수단(아래 PITR·대기 복제본)을 먼저 다시 고른다.

| 항목 | 권장 시작값 | 근거 | 바꿀 때의 판단 기준 |
|---|---|---|---|
| 전체 백업 주기 | 매일 1회, 02:00 Asia/Seoul 에 §2 실행 | §2 는 DB 와 첨부를 한 시점으로 묶으려고 앱을 멈춘다. 02:00 은 앱 정기 작업(첨부 점검 03:15, 로그 파기 04:00, 알림 파기 04:30 — 모두 Asia/Seoul)과 겹치지 않는다. 앱이 멈춘 동안 시각이 지난 정기 작업은 그날 건너뛴다 | §2 실행 시간(앱 중지 시간)이 업무가 허용하는 중지 시간을 넘거나 하루치 손실(아래 RPO)을 감당할 수 없으면 PITR 로 넘어간다 |
| 성공 감시 | 매일 업무 시작 전에 새 `backup-*` 가 생겼고 `sha256sum -c` 가 통과했는지 보고, 아니면 경보 | 감시가 없으면 실패한 백업을 복원할 때 처음 안다 — RPO 가 조용히 늘어난다 | 경보 경로는 기관 관측 체계([관측성 기본값](observability-baseline.md))에 맞춘다 |
| 보존 | 일일 14세대 + 매주 일요일분 8세대(약 2개월) | 잘못된 관리 작업·결함 배포 같은 논리 손상은 장애처럼 바로 드러나지 않는다 — 발견까지보다 오래 보존해야 손상 전 시점이 남는다. 일일 14세대는 아래 주 1회 도구 훈련이 백업 고장을 늦어도 7일 안에 찾을 때 그 앞의 성공 백업이 아직 남게 하는 길이다(7 < 14). 주간 8세대는 월 단위 업무(월말 마감) 뒤에 드러나는 손상을 덮는다. 보관량은 백업 세트 크기의 22배를 넘지 않는다(최근 일요일분은 일일 세대와 겹친다) | 늘리는 쪽은 법정 보존 의무와 늦게 발견되는 손상이다. 줄이는 쪽은 개인정보 파기다 — 앱에서 지운 행도 백업에는 보존 기간만큼 남으므로 백업 보존 기간을 내부관리계획에 적고, 로그 보존 기본값(24개월, [로그 보존 정책](log-retention-policy.md))보다 길게 두지 않는다 |
| 보관 위치 | 운영 호스트 밖 1곳(다른 서버·스토리지) + 바꾸거나 지울 수 없는 사본 1곳(오프라인 매체나 객체 잠금) | 같은 호스트의 백업은 호스트 장애·랜섬웨어와 함께 사라진다(3-2-1 원칙) | 기관 보안 정책과 망 분리 규정 |
| 백업 파일 암호화 | 저장할 때 암호화하고, 그 키는 `ALGORITHM_KEY` 와 다른 곳에 둔다 | 덤프에는 이름·연락처 같은 평문 개인정보와 접근 기록이 있다(주민등록번호만 `ALGORITHM_KEY` 로 암호화돼 있다). 두 키를 한곳에 두면 한 번의 유출로 둘 다 풀린다 | 법적 판단은 기관 개인정보 보호책임자가 한다 |
| RPO | 일일 백업만이면 최대 24시간(실패한 백업을 다음 날 알면 48시간) | 복구 지점은 마지막으로 성공한 백업이다 | 하루치 입력을 다시 받을 수 없으면 PITR |
| PITR(WAL 보관) | 기본은 쓰지 않는다. 쓸 때 시작값은 `archive_mode=on`, `archive_timeout=300`, 기준 백업(`pg_basebackup`) 주 1회이고, WAL 은 보존 중인 가장 오래된 기준 백업 이후 전부를 둔다(기준 백업 2세대, 약 14일) | 템플릿은 WAL 보관소를 줄 수 없다. 보관소 없이 켜서 `archive_command` 가 실패하면 PostgreSQL 이 WAL 을 지우지 못해 디스크가 차고 DB 가 멈춘다. `archive_timeout=300` 이면 쓰기가 있는 동안 5분마다 16MB 세그먼트를 닫아 RPO 가 약 5분과 전송 지연이 된다(하루 최대 288개, 압축 전 약 4.6GB) | RPO 목표, 보관소 비용·전송 대역. §3 은 PITR 복원을 다루지 않으므로 켜기 전에 별도 복원 런북을 승인한다 |
| PITR 의 첨부 | 첨부는 삭제를 전파하지 않는 누적 사본(예: 1시간마다)으로 두고, 복구 시점 T 보다 늦게 끝난 사본으로 복원한다 | 저장 파일명은 업로드마다 새 UUID 이고 같은 이름을 덮어쓰지 않는다(`CREATE_NEW`). 그래서 T 의 DB 가 가리키는 파일은 모두 T 전에 쓰였고, T 뒤에 끝난 누적 사본에는 T 뒤에 지운 파일까지 남아 있다. T 뒤에 올라온 파일은 고아 후보로 남는데 첨부 점검은 보고만 하고 지우지 않는다 | 객체 저장소의 버전 관리를 쓰면 그 시점 복원으로 대신한다 |
| RTO | 시작 목표 4시간(업무시간 장애, 덤프 10GB 안팎). 목표는 "훈련 실측 × 2 + 인지·결정 시간" 이상이어야 한다 | 복구 시간 = 인지·복원 결정 + 호스트·이미지 준비 + 백업 세트 전송·검증 + `pg_restore` + 첨부 풀기 + 기동·확인이다. 저장소가 잴 수 있는 것은 복원·검증 구간(§5.1 도구 실측)뿐이고 나머지는 §5.2 전체 훈련이 잰다. × 2 는 실제 장애의 경합·긴장·처음 하는 운영자를 위한 여유다 | 실측 × 2 가 목표를 넘으면 목표를 늘리거나 수단(대기 복제본·스토리지 스냅숏)을 바꾼다. 야간·휴일 대응 체계가 없으면 인지 시간을 다음 업무 시작까지로 잡는다 |
| 훈련 주기 | 도구 훈련(§5.1)은 주 1회 최신 백업, 전체 훈련(§5.2)은 분기 1회와 큰 스키마 변경·업그레이드 직전 | 주 1회면 백업 고장을 늦어도 7일 안에 찾는다(보존 14세대 안). 전체 훈련은 이미지·키·네트워크까지 보므로 비용이 커 분기로 둔다 | 백업 형식·스키마가 자주 바뀌면 전체 훈련을 그 변경마다 한다 |
| 복구 판정 기준 | §5.1 확인이 모두 PASS(행 수 같음, 첨부 실물 부재·크기 차이 0, 감사 원장 트리거 활성, Flyway validate 통과) + §3 확인 4가지 + 전체 소요가 RTO 안 | 하나라도 빠지면 "복원했다"가 아니라 "일부를 되살렸다"다. 고아 후보는 실패가 아니지만 건수를 기록한다 | 기관이 확인 항목을 더할 수는 있어도, 뺄 때는 사유를 기록한다 |

### 4.3 기관이 정하고 기록할 것

| 항목 | 결정 주체 | 기록 위치 |
|---|---|---|
| 백업 주기·시각 | 운영 관리자 | `backup-recovery` 근거 파일(§5.3) |
| 보존 기간·세대 수 | 운영 관리자·개인정보 보호책임자 | 같은 곳과 내부관리계획 |
| RTO·RPO | 사용자(업무 소유자)·운영 관리자 | 같은 곳 |
| 보관 위치·암호화 | 보안 담당 | 같은 곳(위치는 식별자만, 경로·자격은 적지 않는다) |
| PITR 여부 | 운영 관리자 | 같은 곳, 쓰면 별도 복원 런북 |

결정은 원본 저장소의 결정 대기 레지스트리가 아니라 기관 승인 원장(`config/governance/adoption-review.json`)과 그
근거 파일로 남는다([검토 수명 가이드](../03-guides/governance-review-lifecycle.md#3-온라인-제품의-기관-도입)).

## 5. 정기 복원 훈련

백업은 **복원해 본 적이 있을 때만** 백업이다. 훈련은 두 단계이고, 그 기록(§5.3)이 없으면 기관 `backup-recovery`
통제를 승인할 수 없다.

### 5.1 도구 훈련 — DB·첨부 구성 요소

운영과 떨어진 훈련 호스트(Docker 필요)에서 백업 세트 하나를 지정해 실행한다. 마이그레이션 폴더는 백업 manifest 의
`release_revision` 을 체크아웃한 것을 쓴다.

```bash
node scripts/restore-drill.mjs --backup-dir /secure/restore-drill/backup-YYYYMMDDThhmmssZ \
  --migrations <release_revision 체크아웃>/api-server/src/main/resources/db/migration
```

[훈련 도구](../../scripts/restore-drill.mjs)는 운영 DB·볼륨·`.env` 를 읽지 않는다. compose 의 `db` 와 같은 PostgreSQL
digest 로 일회용 컨테이너를 내부 전용 네트워크·전용 볼륨에 만들고, 호스트 포트를 열지 않으며, 끝나면 실행 라벨로
찾아 지운다. 비밀번호는 실행마다 새로 만든다. 결과는 `.agent/temp/restore-drill-<실행 id>/result.json`(또는
`--output`)에 남고 건수·해시·시간·확인 결과만 담는다 — 덤프 값·키·도구의 원문 출력은 담지 않는다(`--verbose` 는
콘솔에만 쓴다). 하나라도 실패하면 종료 코드 1 이다. 앱 이미지를 띄우지 않으므로 PII 복호화·로그인·화면의 첨부
점검은 §5.2 몫이다. 첨부 저장소 접두가 기본(`uploads` — 볼륨 `/app/storage` 아래 `file.upload.path`)과 다르면
`--storage-prefix` 로 준다.

#### 훈련 도구의 확인 항목

| 확인 | 하는 일 | 실패 기준 |
|---|---|---|
| `backup-set` | 다섯 파일을 `sha256.txt` 와 대조하고 manifest·스키마 버전·행 수 기록의 형식을 본다 | 파일 누락·빈 파일·SHA-256 불일치·형식 오류. `table-counts.tsv` 가 없는 이전 절차의 백업도 여기서 멈춘다 — 행 수 기준이 없으면 복원이 완전한지 판정할 수 없다 |
| `db-restore` | `pg_restore --list` 로 목록을 읽고 §3 과 같은 `--exit-on-error --no-owner --no-acl` 로 일회용 DB 에 복원한다 | 목록을 읽지 못하거나 복원 중 첫 오류 |
| `flyway-validate` | 앱과 같은 Flyway 12.4.0 으로 복원본의 이력을 마이그레이션 폴더와 대조한다 | 체크섬 불일치·적용 안 된 마이그레이션·실패 이력 |
| `schema-version` | 복원본의 최신 적용 버전(§2 의 질의)이 `schema-version.txt` 와 같은지 본다 | 다른 버전 |
| `table-counts` | `public` 의 모든 기본 표 행 수를 §2 와 같은 질의로 세어 `table-counts.tsv` 와 대조한다 | 표가 없거나 늘었거나 행 수가 하나라도 다름 |
| `core-tables` | 시드가 채우는 핵심 표(이력·사용자·권한·메뉴·공통코드)가 비어 있지 않은지 본다 | 비어 있음 — 다른 DB 를 백업했거나 복원이 비었다 |
| `audit-ledger` | 마이그레이션이 `fn_adt_log_chg_prhb` 로 거는 감사 원장 트리거(V2_132)가 복원본에 활성 상태로 있는지 보고, 행이 있는 원장마다 수정·삭제가 거부되는지 되돌리는 트랜잭션 안에서 시험한다 | 트리거 없음·비활성·종류 다름, 또는 수정·삭제가 통과 |
| `attachments` | 첨부 tar 를 풀어 `tb_file_detail` 의 메타가 가리키는 실물(`<접두>/<file_strg_path>/<strg_file_nm>`)과 크기(`file_sz`)를 대조하고, `general/` 아래 메타 없는 실물을 고아 후보로 센다 | 실물 부재·크기 차이. 고아 후보는 실패가 아니라 보고다(커밋 전 업로드와 구별할 수 없다) |
| `cleanup` | 이 실행이 만든 컨테이너·볼륨·네트워크를 실행 라벨로 찾아 지우고 남은 수를 센다 | 남은 자원이 있거나 목록을 읽지 못함(0 으로 단정하지 않는다) |

[계약](../../scripts/restore-drill.test.mjs)이 이 표의 확인 목록, §2·§3 의 행 수·스키마 버전 질의, 백업 세트
파일 목록과 복원 선택지를 도구와 대조한다. 한쪽만 바꾸면 운영 계약이 붉어진다.

도구 자체는 합성 백업 세트로 점검한다. `node scripts/restore-drill.mjs --synthetic-backup <새 디렉터리>` 가 현재
마이그레이션(인가 Contract 포함)으로 만든 DB 에 합성 첨부 2건·감사 원장 행 2건·고아 후보 1건을 넣어 §2 와 같은 다섯 파일과
`sha256.txt` 를 만든다. manifest 의 `fixture=synthetic` 이 결과의 `backup.synthetic: true` 로 남아 운영 백업으로
오인되지 않는다.

2026-10-19 로컬 실행(스키마 2.134, 표 93개·18,490행)에서 합성 세트는 9개 확인을 모두 통과했다(세 번 실행, `pg_restore`
약 4초, 전체 약 18~24초, 남은 자원 0). 의도적 위반 여섯 가지는 각각 의도한 확인에서 실패했다 — 덤프 1바이트
변조(`backup-set`), `table-counts.tsv` 없는 이전 형식(`backup-set`), 행 수 기록 변조(`table-counts`), 첨부 실물
1건 제거(`attachments`), 감사 원장 트리거 1개 제거(`audit-ledger`, 그 원장의 수정·삭제도 통과), 마이그레이션 파일
한 줄 추가(`flyway-validate`, 체크섬 불일치). 작은 합성 데이터의 로컬 관측이며 운영 규모 복원 시간이나 RTO 의
증거가 아니다.

### 5.2 전체 훈련 — 앱까지

- 운영과 격리된 환경에서 §3 을 처음부터 끝까지 실행한다(이미지 pull 부터 앱 기동까지).
- §3 의 행 수 대조(3-1)와 "복원 직후 반드시 확인할 것" 4가지를 모두 통과한다.
- 장애 인지부터 확인 완료까지의 시간을 재고 합의 RTO 안인지 본다.

### 5.3 결과 기록 양식

기관 `backup-recovery` 통제의 근거 파일로 쓴다(승인 원장의 `evidence` 가 이 파일의 경로·SHA-256 을 가리킨다).
비밀값·접속 정보·개인정보·백업 파일 경로는 적지 않는다. 도구의 `result.json` 과 원문 로그는 기관의 안전한 보관
경로에 두고, 이 기록에는 그 SHA-256 만 남긴다.

```markdown
# 복원 훈련 기록 — <environmentId> <YYYY-MM-DD>

- 훈련 종류: 도구 훈련(§5.1) | 전체 훈련(§5.2)
- 실행자(역할)·검토자(역할):
- 시작·끝(UTC):
- 백업 세트: stamp, release_revision, db.dump·files.tar.gz SHA-256, 백업 시각(UTC)
- 백업 보관 위치: 식별자만(경로·자격 금지)
- 훈련 환경: 호스트 식별자, PostgreSQL 이미지 digest, 마이그레이션 폴더의 커밋
- 도구 결과: result.json SHA-256, status, 확인별 결과(backup-set … cleanup)
- 행 수: 표·행 수, 차이 0 여부
- 첨부: 메타 건수, 실물 부재·크기 차이 건수, 고아 후보 건수와 판단
- 감사 원장: 트리거 활성, 수정·삭제 거부(빈 원장은 카탈로그만)
- 전체 훈련만: 앱 기동, PII 복호화, 첨부 정합 점검, 로그인 결과
- 소요 시간: 복원·검증 / 전체 / 합의 RTO → 안 | 밖
- 데이터 손실 관점: 백업 시각과 가정한 장애 시각의 간격(합의 RPO 대비)
- 적용한 시작값과 바꾼 값·그 사유(§4.2):
- 후속 조치와 담당:
```

## 관련 문서

- [crypto-key-rotation.md](crypto-key-rotation.md) — 암호화 마스터 키 회전. 회전 중 백업은 어느 키로
  복원되는지 반드시 확인한다.
- [verification-blindspots.md](verification-blindspots.md) — 저장소 CI 로 증명할 수 없는 축의 목록.
- [log-retention-policy.md](log-retention-policy.md) — DB 백업에는 로그 테이블도 포함되며, 만료 파기·법정 보존은 별도 정책을 따른다.
