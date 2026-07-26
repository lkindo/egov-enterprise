#!/bin/bash

# Configuration
APP_NAME="egov-enterprise"
WORKSPACE_DIR=$(pwd)
DOCKER_COMPOSE_FILE="docker-compose.yml"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Starting Deployment for ${APP_NAME} ===${NC}"

# 1. Check for JWT_SECRET
if [ -z "$JWT_SECRET" ]; then
    echo "Warning: JWT_SECRET is not set. Using default secret for development."
    export JWT_SECRET="dGhpcy1pcy1hLXZlcnktbG9uZy1zZWNyZXQta2V5LWZvci1lZ292LWVudGVycHJpc2UtbW9kZXJuaXphdGlvbg=="
fi

# 2. Build Backend (Local build to ensure artifacts are ready if not using Docker builder)
# echo -e "${GREEN}Building Backend Artifacts...${NC}"
# ./gradlew :api-server:bootJar -x test

# 3. Docker Compose Build and Up
echo -e "${GREEN}Building and Starting Docker Containers...${NC}"
docker-compose -f ${DOCKER_COMPOSE_FILE} up --build -d

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
echo -e "Swagger UI: http://localhost:8080/swagger-ui/index.html"
