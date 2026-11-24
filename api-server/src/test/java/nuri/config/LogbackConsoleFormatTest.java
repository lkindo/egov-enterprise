package nuri.config;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.encoder.PatternLayoutEncoder;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.classic.spi.LoggingEvent;
import ch.qos.logback.classic.util.ContextInitializer;
import ch.qos.logback.core.ConsoleAppender;
import ch.qos.logback.core.FileAppender;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import nuri.api.config.logging.PiiMaskingPatternLayoutEncoder;
import nuri.api.config.logging.PiiMaskingStructuredLogEncoder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.slf4j.LoggerFactory;
import org.slf4j.event.KeyValuePair;
import org.springframework.boot.logging.LoggingInitializationContext;
import org.springframework.boot.logging.logback.LogbackLoggingSystem;
import org.springframework.boot.logging.logback.StructuredLogEncoder;
import org.springframework.mock.env.MockEnvironment;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * 운영 콘솔 로그 형식·전역 PII 마스킹 계약 — {@code logback-spring.xml} 의 {@code json-logs} opt-in 및
 * 텍스트·구조화·파일 출력 마스킹 검증.
 *
 * <p>설정 파일을 문자열로 검사하지 않고 Spring Boot 가 실제로 쓰는 {@link LogbackLoggingSystem} 으로 적재해,
 * root 에 붙은 CONSOLE/FILE appender 의 encoder 와 그 encoder 가 실제로 내는 바이트를 본다.
 */
class LogbackConsoleFormatTest {

    private static final String CONFIG = "classpath:logback-spring.xml";
    private static final JsonMapper JSON = JsonMapper.builder().build();

    private final LoggerContext context = (LoggerContext) LoggerFactory.getILoggerFactory();
    private LogbackLoggingSystem loggingSystem;

    @AfterEach
    void restoreDefaultLogging() throws Exception {
        if (loggingSystem != null) {
            loggingSystem.cleanUp();
        }
        // Boot 는 logging.structured.format.console·logging.file.name·logging.pattern.correlation 을
        // JVM 시스템 프로퍼티로 옮기고 되돌리지 않는다. 테스트 간 누수를 막는다.
        System.clearProperty("CONSOLE_LOG_STRUCTURED_FORMAT");
        System.clearProperty("LOG_FILE");
        System.clearProperty("LOG_CORRELATION_PATTERN");
        System.clearProperty("EXPECT_CORRELATION_ID");
        // 같은 JVM 에서 뒤따르는 비-Spring 테스트가 이 테스트의 appender 를 물려받지 않게 기본 구성으로 되돌린다.
        context.reset();
        new ContextInitializer(context).autoConfig();
    }

    @Test
    @DisplayName("prod 기본값은 사람이 읽는 텍스트 로그다 — 수집 스택이 정해지기 전(PD-OPS-001) 형식을 바꾸지 않는다")
    void prodDefaultsToTextConsole() {
        ConsoleAppender<ILoggingEvent> console = loadConsole(environment("prod"));

        assertThat(console.getEncoder()).isInstanceOf(PatternLayoutEncoder.class);
        String line = encode(console, "text-console-probe");
        assertThat(line).contains("text-console-probe").doesNotStartWith("{");
    }

    /**
     * 형식을 지정하지 않은 기본 경로. 이 테스트가 막는 결함은 실측이다 — logback 기본값 문법(`:-ecs`)으로 두면 Boot 가
     * 채워 둔 빈 문자열 때문에 기본값이 적용되지 않고 {@code Unknown format ''} 으로 기동이 실패했다.
     */
    @Test
    @DisplayName("json-logs 를 함께 켜면 같은 CONSOLE appender 가 ECS JSON 을 낸다")
    void jsonLogsProfileEmitsEcsJson() {
        ConsoleAppender<ILoggingEvent> console = loadConsole(environment("prod", "json-logs"));

        assertThat(console.getEncoder()).isInstanceOf(StructuredLogEncoder.class);
        String line = encode(console, "json-console-probe").strip();
        assertThat(line)
                .startsWith("{")
                .endsWith("}")
                .contains("\"message\":\"json-console-probe\"")
                .contains("\"ecs\":{\"version\"");
    }

    @Test
    @DisplayName("logging.structured.format.console 이 설정되면 ECS 기본값 대신 그 형식을 쓴다")
    void structuredFormatPropertyOverridesEcsDefault() {
        MockEnvironment environment = environment("prod", "json-logs");
        environment.setProperty("logging.structured.format.console", "logstash");

        ConsoleAppender<ILoggingEvent> console = loadConsole(environment);

        String line = encode(console, "logstash-console-probe");
        assertThat(line).contains("\"@version\":\"1\"").doesNotContain("\"ecs\":");
    }

    @Test
    @DisplayName("텍스트 콘솔은 메시지·예외·MDC 의 PII·토큰을 가리고 traceId·spanId 와 스택 프레임을 보존한다")
    void textConsoleMasksPiiWhilePreservingCorrelationAndStackTrace() {
        MockEnvironment environment = environment("prod");
        environment.setProperty("logging.pattern.correlation", "[%correlationId] [actor=%X{actorEmail:-}] ");
        ConsoleAppender<ILoggingEvent> console = loadConsole(environment);
        assertThat(console.getEncoder()).isInstanceOf(PiiMaskingPatternLayoutEncoder.class);

        String rendered = encode(console, sensitiveEvent());

        assertThat(rendered)
                .contains("ho***@example.com")
                .contains("010-****-5678")
                .contains("900101-*******")
                .contains("Bearer ***")
                .contains("cause al***@example.com")
                .contains("suppressed 011-****-2222")
                .contains("bo***@example.com")
                .contains("0af7651916cd43dd8448eb211c80319c")
                .contains("b7ad6b7169203331")
                .contains(LogbackConsoleFormatTest.class.getName())
                .doesNotContain("hong@example.com")
                .doesNotContain("010-1234-5678")
                .doesNotContain("900101-1234567")
                .doesNotContain("eyJhbGci")
                .doesNotContain("alice@example.com")
                .doesNotContain("011-333-2222")
                .doesNotContain("bob@example.com");
    }

    @Test
    @DisplayName("json-logs(ECS·Logstash·GELF) 는 유효한 JSON 구조를 유지하며 메시지·예외·MDC·KVP 의 PII 를 가린다")
    void jsonConsoleFormatsMaskPiiAndKeepValidJson() throws Exception {
        for (String format : List.of("ecs", "logstash", "gelf")) {
            MockEnvironment environment = environment("prod", "json-logs");
            environment.setProperty("logging.structured.format.console", format);

            ConsoleAppender<ILoggingEvent> console = loadConsole(environment);
            assertThat(console.getEncoder()).isInstanceOf(PiiMaskingStructuredLogEncoder.class);

            String jsonLine = encode(console, sensitiveEvent()).strip();
            JsonNode root = JSON.readTree(jsonLine);

            assertThat(root.isObject()).isTrue();
            assertThat(jsonLine)
                    .contains("ho***@example.com")
                    .contains("010-****-5678")
                    .contains("900101-*******")
                    .contains("Bearer ***")
                    .contains("bo***@example.com")
                    .contains("010****8888")
                    .contains("0af7651916cd43dd8448eb211c80319c")
                    .contains("b7ad6b7169203331")
                    .doesNotContain("hong@example.com")
                    .doesNotContain("010-1234-5678")
                    .doesNotContain("900101-1234567")
                    .doesNotContain("eyJhbGci")
                    .doesNotContain("alice@example.com")
                    .doesNotContain("bob@example.com")
                    .doesNotContain("01099998888");
            loggingSystem.cleanUp();
            System.clearProperty("CONSOLE_LOG_STRUCTURED_FORMAT");
            System.clearProperty("LOG_CORRELATION_PATTERN");
            System.clearProperty("EXPECT_CORRELATION_ID");
            context.reset();
        }
    }

    @Test
    @DisplayName("logging.structured.json.stacktrace.root=first 설정에서도 예외 로그를 누락 없이 가려서 출력한다")
    void jsonLogsWithStackTracePrinterMasksExceptionWithoutDroppingEvent() {
        MockEnvironment environment = environment("prod", "json-logs");
        environment.setProperty("logging.structured.json.stacktrace.root", "first");

        ConsoleAppender<ILoggingEvent> console = loadConsole(environment);
        assertThat(console.getEncoder()).isInstanceOf(PiiMaskingStructuredLogEncoder.class);

        String jsonLine = encode(console, sensitiveEvent()).strip();
        assertThat(jsonLine).isNotBlank();
        JsonNode root = JSON.readTree(jsonLine);

        assertThat(root.isObject()).isTrue();
        assertThat(root.at("/error/type").asString()).isEqualTo("java.lang.RuntimeException");
        assertThat(root.at("/error/message").asString()).isEqualTo("outer 900101-*******");
        assertThat(root.at("/error/stack_trace").asString())
                .contains("java.lang.IllegalStateException: cause al***@example.com")
                .contains("java.lang.RuntimeException: outer 900101-*******")
                .contains("java.lang.IllegalArgumentException: suppressed 011-****-2222");
        assertThat(jsonLine)
                .doesNotContain("alice@example.com")
                .doesNotContain("900101-1234567")
                .doesNotContain("011-333-2222")
                .doesNotContain("hong@example.com")
                .doesNotContain("010-1234-5678")
                .doesNotContain("eyJhbGci");
    }

    @Test
    @DisplayName("비-prod FILE appender 도 PII 마스킹 인코더를 사용한다")
    void nonProdFileAppenderUsesPiiMaskingEncoder(@TempDir Path tempDir) {
        MockEnvironment environment = environment("dev");
        environment.setProperty("logging.file.name", tempDir.resolve("backend.log").toString());

        loadConsole(environment);
        Logger root = context.getLogger(Logger.ROOT_LOGGER_NAME);
        FileAppender<ILoggingEvent> fileAppender = (FileAppender<ILoggingEvent>) root.getAppender("FILE");

        assertThat(fileAppender).isNotNull();
        assertThat(fileAppender.isStarted()).isTrue();
        assertThat(fileAppender.getEncoder()).isInstanceOf(PiiMaskingPatternLayoutEncoder.class);

        String line = new String(fileAppender.getEncoder().encode(sensitiveEvent()), StandardCharsets.UTF_8);
        assertThat(line)
                .contains("ho***@example.com")
                .doesNotContain("hong@example.com")
                .doesNotContain("010-1234-5678");
    }

    private static MockEnvironment environment(String... profiles) {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles(profiles);
        environment.setProperty("spring.application.name", "egov-api-server");
        return environment;
    }

    private ConsoleAppender<ILoggingEvent> loadConsole(MockEnvironment environment) {
        loggingSystem = new LogbackLoggingSystem(getClass().getClassLoader());
        // 같은 JVM 에서 먼저 뜬 Spring 컨텍스트가 남긴 "초기화됨" 표식을 지워야 새 구성이 실제로 적재된다.
        loggingSystem.cleanUp();
        loggingSystem.beforeInitialize();
        loggingSystem.initialize(new LoggingInitializationContext(environment), CONFIG, null);

        Logger root = context.getLogger(Logger.ROOT_LOGGER_NAME);
        ConsoleAppender<ILoggingEvent> console = (ConsoleAppender<ILoggingEvent>) root.getAppender("CONSOLE");
        assertThat(console).as("root 에 CONSOLE appender 가 붙어 있어야 로그가 나간다").isNotNull();
        assertThat(console.isStarted()).as("encoder 기동 실패는 appender 를 멈춘 채로 둔다").isTrue();
        return console;
    }

    private String encode(ConsoleAppender<ILoggingEvent> console, String message) {
        LoggingEvent event = new LoggingEvent(getClass().getName(), context.getLogger(getClass()), Level.INFO,
                message, null, null);
        return encode(console, event);
    }

    private String encode(ConsoleAppender<ILoggingEvent> console, ILoggingEvent event) {
        return new String(console.getEncoder().encode(event), StandardCharsets.UTF_8);
    }

    private LoggingEvent sensitiveEvent() {
        IllegalStateException cause = new IllegalStateException("cause alice@example.com");
        RuntimeException failure = new RuntimeException("outer 900101-1234567", cause);
        failure.addSuppressed(new IllegalArgumentException("suppressed 011-333-2222"));

        String syntheticToken = String.join(".", "eyJhbGciOiJIUzI1NiJ9", "eyJzdWIiOiIxMjM0NSJ9", "signature99");
        LoggingEvent event = new LoggingEvent(
                getClass().getName(),
                context.getLogger(getClass()),
                Level.ERROR,
                "contact hong@example.com tel 010-1234-5678 Bearer " + syntheticToken,
                failure,
                null);
        event.setMDCPropertyMap(Map.of(
                "traceId", "0af7651916cd43dd8448eb211c80319c",
                "spanId", "b7ad6b7169203331",
                "actorEmail", "bob@example.com"));
        event.setKeyValuePairs(List.of(new KeyValuePair("contactPhone", "01099998888")));
        return event;
    }
}
