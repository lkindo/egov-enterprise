#!/bin/bash

# Configuration
APP_NAME="egov-enterprise"
WORKSPACE_DIR=$(pwd)
# [W0-04] 운영 오버레이를 항상 함께 적용한다. base 단독으로 올리면 application-prod.yml 이
#   한 번도 적용되지 않아 개발 형상(dev 시크릿·actuator 확대 노출·비-graceful 종료)이 그대로 운영이 된다.
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"

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

# 2. Build Backend (Local build to ensure artifacts are ready if not using Docker builder)
# echo -e "${GREEN}Building Backend Artifacts...${NC}"
# ./gradlew :api-server:bootJar -x test

# 3. Docker Compose Build and Up
echo -e "${GREEN}Building and Starting Docker Containers...${NC}"
# docker-compose(v1) 는 GitHub 러너·최신 Docker 배포에서 제거됐다 — v2 서브커맨드를 쓴다.
docker compose ${COMPOSE_FILES} up --build -d

# 4. Wait for Healthchecks
echo -e "${GREEN}Waiting for services to be healthy...${NC}"
max_retries=30
counter=0
while [ $counter -lt $max_retries ]; do
    if docker inspect -f '{{.State.Health.Status}}' egov-api | grep -q "healthy"; then
        echo -e "${GREEN}API is healthy!${NC}"
        break
    fi
    echo -n "."
    sleep 5
    counter=$((counter+1))
done

if [ $counter -eq $max_retries ]; then
    echo -e "${BLUE}Timeout waiting for API healthcheck. Please check logs with 'docker logs egov-api'${NC}"
    exit 1
fi

echo -e "${BLUE}=== Deployment Completed Successfully ===${NC}"
echo -e "Frontend: http://localhost:3000"
echo -e "Backend API: http://localhost:8080/api/v1"
# prod 프로파일은 springdoc 을 비활성화하므로 Swagger UI 안내를 출력하지 않는다.
