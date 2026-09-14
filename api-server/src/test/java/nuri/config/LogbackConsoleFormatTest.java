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
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.boot.logging.LoggingInitializationContext;
import org.springframework.boot.logging.logback.LogbackLoggingSystem;
import org.springframework.boot.logging.logback.StructuredLogEncoder;
import org.springframework.mock.env.MockEnvironment;

/**
 * 운영 콘솔 로그 형식 계약 — {@code logback-spring.xml} 의 {@code json-logs} opt-in.
 *
 * <p>설정 파일을 문자열로 검사하지 않고 Spring Boot 가 실제로 쓰는 {@link LogbackLoggingSystem} 으로 적재해,
 * root 에 붙은 CONSOLE appender 의 encoder 와 그 encoder 가 실제로 내는 바이트를 본다. XML 이 그럴듯해 보여도
 * appender 가 root 에서 빠지거나 encoder 가 기동에 실패하면 로그가 조용히 사라지기 때문이다.
 */
class LogbackConsoleFormatTest {

    private static final String CONFIG = "classpath:logback-spring.xml";

    private final LoggerContext context = (LoggerContext) LoggerFactory.getILoggerFactory();
    private LogbackLoggingSystem loggingSystem;

    @AfterEach
    void restoreDefaultLogging() throws Exception {
        if (loggingSystem != null) {
            loggingSystem.cleanUp();
        }
        // Boot 는 logging.structured.format.console 을 JVM 시스템 프로퍼티로 옮기고 되돌리지 않는다(실측: 형식 재정의
        // 테스트가 먼저 돌면 다음 테스트의 ECS 기본값이 logstash 로 바뀌었다). 테스트 간 누수를 막는다.
        System.clearProperty("CONSOLE_LOG_STRUCTURED_FORMAT");
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
        return new String(console.getEncoder().encode(event), StandardCharsets.UTF_8);
    }
}
