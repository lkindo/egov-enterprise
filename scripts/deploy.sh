#!/bin/bash
set -euo pipefail

# Configuration
APP_NAME="egov-enterprise"
WORKSPACE_DIR=$(pwd)
# [W0-04] 운영 오버레이를 항상 함께 적용한다. base 단독으로 올리면 application-prod.yml 이
#   한 번도 적용되지 않아 개발 형상(dev 시크릿·actuator 확대 노출·비-graceful 종료)이 그대로 운영이 된다.
COMPOSE_FILES=(-f docker-compose.yml -f docker-compose.prod.yml)
ATTACHMENT_MIGRATION_MARKER=".egov-attachment-migration-v1"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Starting Deployment for ${APP_NAME} ===${NC}"

# 1. 배포 필수 시크릿 검증
#    [W0-04] 종전에는 JWT_SECRET 미설정 시 **저장소에 커밋된 dev 키를 경고만 남기고 그대로 주입**했다.
#    공개 저장소의 서명 키로 운영 토큰을 서명하면 임의 esntlId 를 subject 로 하는 토큰을 누구나 위조할 수 있다.
#    조용한 대체를 금지하고 배포를 중단한다.
MISSING=""
# [W1-13 정합] MAIL_HOST 는 docker-compose.prod.yml 이 `${MAIL_HOST:?...}` 로 이미 하드 차단한다.
#   이 목록에서 빠져 있으면 사전 검증을 통과한 뒤 `docker compose up` 단계에서 죽어,
#   운영자가 받는 안내가 갈린다. 차단 지점을 여기로 앞당겨 메시지를 한 곳으로 모은다.
for v in JWT_SECRET ALGORITHM_KEY DB_URL DB_USERNAME DB_PASSWORD ADMIN_INITIAL_PASSWORD MAIL_HOST; do
    eval "val=\${$v:-}"
    if [ -z "$val" ]; then
        MISSING="$MISSING $v"
    fi
done
if [ -n "$MISSING" ]; then
    echo "ERROR: 다음 필수 시크릿이 설정되지 않았습니다:$MISSING" >&2
    echo "       배포를 중단합니다. 개발용 기본값으로 대체하지 않습니다." >&2
    exit 1
fi

# 현재 공식 compose 형상은 api.depends_on.db와 함께 번들 PostgreSQL을 항상 기동한다.
# 외부 관리형 DB URL을 받아 놓고 번들 DB도 함께 올리면 백업/복원 대상과 런타임 DB가 갈라지므로
# 별도 profile이 마련되기 전에는 조용히 지원하는 척하지 않고 중단한다.
case "$DB_URL" in
    jdbc:postgresql://db:5432/egovdb|jdbc:postgresql://db:5432/egovdb\?*) ;;
    *)
        echo "ERROR: 현재 deploy.sh는 compose 번들 DB(jdbc:postgresql://db:5432/egovdb) 전용입니다." >&2
        echo "       관리형 DB는 별도 compose profile과 공급자별 백업/복원 절차가 마련되기 전까지 지원하지 않습니다." >&2
        exit 1
        ;;
esac

# 운영 배포와 백업/복원은 같은 immutable release 이미지를 사용해야 한다. 로컬 checkout을
# `up --build`로 즉석 빌드하면 registry에서 다시 얻을 수 없어 clean host 복원이 불가능하고,
# 백업 manifest의 image provenance도 거짓이 된다. API/프런트 이미지는 동일 revision label을
# 가진 digest reference만 허용한다.
for v in API_IMAGE_REF FRONTEND_IMAGE_REF; do
    eval "ref=\${$v:-}"
    if ! printf '%s\n' "$ref" | grep -Eq '^[^[:space:]@]+@sha256:[0-9a-f]{64}$'; then
        echo "ERROR: $v 는 pull 가능한 registry digest reference여야 합니다." >&2
        exit 1
    fi
    docker pull "$ref"
done

API_RELEASE_REVISION=$(docker image inspect "$API_IMAGE_REF" \
    --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')
FRONTEND_RELEASE_REVISION=$(docker image inspect "$FRONTEND_IMAGE_REF" \
    --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')
if ! printf '%s\n' "$API_RELEASE_REVISION" | grep -Eq '^([0-9a-f]{40}|[0-9a-f]{64})$' || \
   [ "$API_RELEASE_REVISION" != "$FRONTEND_RELEASE_REVISION" ]; then
    echo "ERROR: API와 frontend 이미지는 같은 유효한 release revision label을 가져야 합니다." >&2
    exit 1
fi

# 2. 첨부 저장소 첫 전환 안전장치
#
# 이 배포가 attachment_storage named volume 을 처음 도입할 때, 기존 egov-api 컨테이너의
# /app/storage 는 컨테이너 쓰기 계층에 있다. 그 상태에서 곧바로 `compose up` 하면 기존
# 컨테이너가 제거되고 새 빈 볼륨이 붙어, DB 레코드는 남지만 첨부 실물은 잃는다.
#
# 기존 컨테이너가 이미 이번 compose 가 가리키는 볼륨을 쓰는 경우와 완전한 신규 설치만
# 자동 진행한다. 그 외에는 런북에 따라 기존 데이터를 목표 볼륨으로 복사하고 무결성을
# 확인한 뒤 marker 를 만든 경우에만 진행한다. marker 없는 볼륨을 임의로 통과시키지 않는다.
resolve_attachment_volume() {
    docker compose "${COMPOSE_FILES[@]}" config | awk '
        /^volumes:$/ { in_volumes = 1; next }
        in_volumes && /^[^[:space:]]/ { exit }
        in_volumes && /^  attachment_storage:$/ { in_target = 1; next }
        in_target && /^    name:/ {
            sub(/^    name:[[:space:]]*/, "")
            gsub(/^['\''"]|['\''"]$/, "")
            print
            exit
        }
        in_target && /^  [^[:space:]]/ { exit }
    '
}

if docker inspect egov-api >/dev/null 2>&1; then
    ATTACHMENT_VOLUME=$(resolve_attachment_volume)
    if [ -z "$ATTACHMENT_VOLUME" ]; then
        echo "ERROR: compose 형상에서 attachment_storage 실제 볼륨명을 해석하지 못했습니다." >&2
        exit 1
    fi

    CURRENT_ATTACHMENT_VOLUME=$(docker inspect egov-api --format \
        '{{range .Mounts}}{{if eq .Destination "/app/storage"}}{{if eq .Type "volume"}}{{.Name}}{{else}}{{.Source}}{{end}}{{end}}{{end}}')

    if [ "$CURRENT_ATTACHMENT_VOLUME" != "$ATTACHMENT_VOLUME" ]; then
        if ! docker volume inspect "$ATTACHMENT_VOLUME" >/dev/null 2>&1; then
            echo "ERROR: 기존 egov-api의 첨부 저장소가 목표 볼륨으로 이관되지 않았습니다." >&2
            echo "       docs/04-operations/backup-and-restore-runbook.md의 '최초 볼륨 전환' 절차를 먼저 실행하십시오." >&2
            exit 1
        fi

        LEGACY_API_IMAGE=$(docker inspect egov-api --format '{{.Image}}')
        if ! docker run --rm --user 0:0 --entrypoint sh \
            -v "${ATTACHMENT_VOLUME}:/migration:ro" \
            "$LEGACY_API_IMAGE" -c "test -f /migration/${ATTACHMENT_MIGRATION_MARKER}"; then
            echo "ERROR: 목표 첨부 볼륨의 이관 완료 marker를 확인하지 못했습니다." >&2
            echo "       기존 컨테이너를 재생성하지 않았습니다. 런북의 복사·무결성 검증을 완료하십시오." >&2
            exit 1
        fi
    fi
fi

# 3. Build Backend (Local build to ensure artifacts are ready if not using Docker builder)
# echo -e "${GREEN}Building Backend Artifacts...${NC}"
# ./gradlew :api-server:bootJar -x test

# 4. 검증한 immutable release 이미지로 Docker Compose 기동
echo -e "${GREEN}Starting Verified Release Containers...${NC}"
# docker-compose(v1) 는 GitHub 러너·최신 Docker 배포에서 제거됐다 — v2 서브커맨드를 쓴다.
docker compose "${COMPOSE_FILES[@]}" up --no-build -d --wait

# 5. Compose의 이름/과거 컨테이너 상태가 아니라 이번에 기동한 두 서비스의 image와 health를
#    검증한다. 이전 egov-api만 healthy인 상태나 frontend 단독 실패를 성공으로 오판하지 않는다.
API_CONTAINER=$(docker compose "${COMPOSE_FILES[@]}" ps -q api)
FRONTEND_CONTAINER=$(docker compose "${COMPOSE_FILES[@]}" ps -q frontend)
if [ -z "$API_CONTAINER" ] || [ -z "$FRONTEND_CONTAINER" ]; then
    echo "ERROR: 이번 release의 api/frontend 컨테이너를 모두 찾지 못했습니다." >&2
    exit 1
fi

if [ "$(docker inspect "$API_CONTAINER" --format '{{.Image}}')" != \
     "$(docker image inspect "$API_IMAGE_REF" --format '{{.Id}}')" ] || \
   [ "$(docker inspect "$FRONTEND_CONTAINER" --format '{{.Image}}')" != \
     "$(docker image inspect "$FRONTEND_IMAGE_REF" --format '{{.Id}}')" ]; then
    echo "ERROR: 실행 중인 컨테이너가 검증한 digest release 이미지와 다릅니다." >&2
    exit 1
fi

for container in "$API_CONTAINER" "$FRONTEND_CONTAINER"; do
    if [ "$(docker inspect "$container" --format '{{.State.Health.Status}}')" != "healthy" ]; then
        echo "ERROR: api/frontend release가 모두 healthy 상태가 아닙니다." >&2
        exit 1
    fi
done
echo -e "${GREEN}API and frontend are healthy on the verified release images.${NC}"

echo -e "${BLUE}=== Deployment Completed Successfully ===${NC}"
echo -e "Frontend: http://localhost:3000"
echo -e "Backend API: http://localhost:8080/api/v1"
# prod 프로파일은 springdoc 을 비활성화하므로 Swagger UI 안내를 출력하지 않는다.
