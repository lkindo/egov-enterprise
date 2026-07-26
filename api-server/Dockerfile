# Stage 1: Build
FROM gradle:9.4.1-jdk21 AS builder
WORKDIR /app
# Only copy dependency files first for better caching
COPY gradle /app/gradle
COPY gradlew /app/gradlew
COPY build.gradle /app/
COPY settings.gradle /app/
COPY gradle.properties /app/
# [2026-07-26 정정] business-suite 는 business-core / business-app 으로 분할돼 **존재하지 않는다.**
#   없는 경로를 COPY 하면 이미지 빌드가 즉시 실패하고, 그 결과 `docker compose up -d db api` 가
#   컨테이너를 하나도 만들지 못한 채 exit 1 로 죽는다 — E2E 잡이 이 지점에서 실패했다(실측).
#   CI 과금차단 기간 동안 이미지 빌드가 실행되지 않아 모듈 분할 이후의 정체가 드러나지 않았다.
#   settings.gradle 의 include 목록과 1:1 로 유지할 것.
COPY foundation/build.gradle /app/foundation/
COPY business-core/build.gradle /app/business-core/
COPY business-app/build.gradle /app/business-app/
COPY api-server/build.gradle /app/api-server/
COPY migration-tool/build.gradle /app/migration-tool/
COPY gradle/libs.versions.toml /app/gradle/

# Build dependencies only
RUN ./gradlew :api-server:classes --no-daemon || true

# Copy source and build
COPY . .
RUN ./gradlew :api-server:bootJar -x test --no-daemon

# Stage 2: Run
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Create non-root user and setup directory permissions
RUN addgroup -S spring && adduser -S spring -G spring && \
    mkdir -p logs && \
    chown -R spring:spring /app

USER spring:spring

COPY --from=builder --chown=spring:spring /app/api-server/build/libs/*.jar app.jar

ENV TZ=Asia/Seoul
ENV JAVA_OPTS="-Xms512m -Xmx512m -XX:+UseParallelGC"

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
