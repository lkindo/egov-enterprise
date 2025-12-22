# Stage 1: Build
FROM gradle:8.12-jdk21 AS builder
WORKDIR /app
COPY . .
# Skip tests for faster build
RUN gradle clean :api-server:bootJar -x test --no-daemon

# Stage 2: Run
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/api-server/build/libs/*.jar app.jar

ENV TZ=Asia/Seoul
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
