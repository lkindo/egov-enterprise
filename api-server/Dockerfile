# Stage 1: Build
FROM gradle:9.6.0-jdk21@sha256:6b71d4d40e45200709c178ca0ab10125e1d99e6e44dec6bcbabd0a3371f8e650 AS builder
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

# [방어] gradlew 의 실행 비트가 없으면 `/bin/sh: ./gradlew: Permission denied` 로 빌드가 죽는다.
#   git 인덱스 모드를 100755 로 교정했지만(2026-07-26), Windows 체크아웃 등으로 모드가 유실되는
#   경로가 있어 이미지 안에서 한 번 더 보장한다. Windows 로컬 Docker 빌드는 exec 비트가 없어
#   임의로 755 를 부여하므로 **이 결함을 재현하지 못한다** — 로컬 성공이 CI 성공을 보장하지 않았다.
#
# [방어 2 / 2026-07-28 신설] CR 제거. 실행비트가 있어도 줄바꿈이 CRLF 면 shebang 이 `#!/bin/sh\r`
#   로 읽혀 커널이 인터프리터를 찾지 못하고 **exit 127** 로 죽는다(Permission denied 가 아니라
#   "not found" 라 원인이 전혀 달라 보인다). 실측(2026-07-28): core.autocrlf=true 인 Windows
#   체크아웃에서 정확히 이 증상으로 이미지 빌드가 실패했다. 근본 해결은 `.gitattributes` 의
#   `gradlew text eol=lf` 이며, 여기서는 그 설정이 없는 클론에서도 빌드가 서도록 한 번 더 막는다.
RUN sed -i 's/\r$//' ./gradlew && chmod +x ./gradlew

# Build dependencies only
RUN ./gradlew :api-server:classes --no-daemon || true

# Copy source and build
COPY . .

# [필수] 위 `COPY . .` 가 gradlew 를 호스트 원본으로 **다시 덮어쓴다** — 앞선 sed/chmod 방어는
#   이 시점에 통째로 무효화된다. 따라서 소스 복사 직후 한 번 더 보장해야 실효가 있다.
#   (이 줄이 없으면 위의 방어는 vacuous 하며, 실제 실패 지점은 언제나 아래 bootJar 였다.)
RUN sed -i 's/\r$//' ./gradlew && chmod +x ./gradlew

RUN ./gradlew :api-server:bootJar -x test --no-daemon

# Stage 2: Run
FROM eclipse-temurin:21-jre-alpine@sha256:3f08b13888f595cc49edabea7250ba69499ba25602b267da591720769400e08c
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
