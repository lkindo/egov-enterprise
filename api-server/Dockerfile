# Stage 1: Build
FROM gradle:8.12-jdk21 AS builder
WORKDIR /app
# Only copy dependency files first for better caching
COPY gradle /app/gradle
COPY gradlew /app/gradlew
COPY build.gradle /app/
COPY settings.gradle /app/
COPY gradle.properties /app/
COPY common-core/build.gradle /app/common-core/
COPY common-domain/build.gradle /app/common-domain/
COPY common-security/build.gradle /app/common-security/
COPY common-service/build.gradle /app/common-service/
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

# Create non-root user
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

COPY --from=builder /app/api-server/build/libs/*.jar app.jar

ENV TZ=Asia/Seoul
ENV JAVA_OPTS="-Xms512m -Xmx512m -XX:+UseParallelGC"

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
