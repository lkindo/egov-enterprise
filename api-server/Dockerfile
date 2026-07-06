# Stage 1: Build
FROM gradle:9.4.1-jdk21 AS builder
WORKDIR /app
# Only copy dependency files first for better caching
COPY gradle /app/gradle
COPY gradlew /app/gradlew
COPY build.gradle /app/
COPY settings.gradle /app/
COPY gradle.properties /app/
COPY foundation/build.gradle /app/foundation/
COPY business-suite/build.gradle /app/business-suite/
COPY api-server/build.gradle /app/api-server/
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
