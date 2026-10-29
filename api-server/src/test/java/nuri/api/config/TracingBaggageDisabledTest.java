package nuri.api.config;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import java.util.logging.Handler;
import java.util.logging.Level;
import java.util.logging.LogRecord;
import java.util.logging.Logger;

import io.micrometer.tracing.Span;
import io.micrometer.tracing.Tracer;
import io.micrometer.tracing.propagation.Propagator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.boot.micrometer.tracing.autoconfigure.MicrometerTracingAutoConfiguration;
import org.springframework.boot.micrometer.tracing.opentelemetry.autoconfigure.OpenTelemetryTracingAutoConfiguration;
import org.springframework.boot.opentelemetry.autoconfigure.OpenTelemetrySdkAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.ApplicationContext;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.FileSystemResource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * W3C baggage 는 받지 않는다(2026-10-29).
 *
 * <p>Boot 기본값은 들어온 {@code baggage} 헤더를 인증 전에 파싱한다. OpenTelemetry 1.67.0 은 깨진 항목마다 예외와
 * WARNING 로그를 남겨, 헤더 하나로 로그와 CPU 를 크게 쓰게 만든다. 이 앱은 baggage 를 쓰지 않으므로 운영
 * {@code application.yml} 에서 끈다. 테스트 컨텍스트는 추적 export 를 꺼 전파기가 noop 이라
 * (TestObservabilityIsolationIntegrationTest) 전체 컨텍스트 테스트로는 이 경로를 볼 수 없다. 그래서
 * OtlpMetricsExportOptInTest 처럼 운영 원문 값을 같은 자동 설정에 넣어 들어온 헤더를 직접 추출한다.
 */
@DisplayName("추적 baggage — 운영 설정은 baggage 를 파싱하지 않고 trace 는 잇는다")
class TracingBaggageDisabledTest {

    private static final String KEY = "management.tracing.baggage.enabled";
    private static final String TRACE_ID = "0af7651916cd43dd8448eb211c80319c";
    private static final String PARENT_SPAN_ID = "b7ad6b7169203331";
    private static final String TRACEPARENT = "00-" + TRACE_ID + "-" + PARENT_SPAN_ID + "-01";
    private static final String BAGGAGE_PARSER_LOGGER = "io.opentelemetry.api.baggage.propagation";
    private static final int INVALID_MEMBERS = 50;

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(OpenTelemetrySdkAutoConfiguration.class,
                    MicrometerTracingAutoConfiguration.class, OpenTelemetryTracingAutoConfiguration.class));

    @Test
    @DisplayName("운영 application.yml 값 그대로면 trace 는 이어지고 baggage 는 읽지도 경고하지도 않는다")
    void mainConfigurationIgnoresBaggage() throws Exception {
        String raw = mainValue(KEY);
        assertThat(raw).isEqualTo("false");
        runner.withPropertyValues(KEY + "=" + raw).run(context -> {
            List<LogRecord> warnings = captureBaggageParserWarnings(() -> extractInScope(context,
                    Map.of("traceparent", TRACEPARENT, "baggage", invalidBaggage()), tracer -> { }));
            assertThat(warnings).extracting(LogRecord::getMessage).isEmpty();

            extractInScope(context, Map.of("traceparent", TRACEPARENT, "baggage", "tenant=a"),
                    tracer -> assertThat(tracer.getAllBaggage()).isEmpty());
        });
    }

    @Test
    @DisplayName("설정이 없으면 Boot 기본값으로 baggage 를 읽고 깨진 항목마다 경고한다 — 위 결과가 키 때문임을 보이는 대조군")
    void bootDefaultParsesBaggage() {
        runner.run(context -> {
            extractInScope(context, Map.of("traceparent", TRACEPARENT, "baggage", "tenant=a"),
                    tracer -> assertThat(tracer.getAllBaggage()).containsEntry("tenant", "a"));

            // OpenTelemetry 가 깨진 항목을 조용히 버리도록 바뀌면 여기가 붉어진다 — 그때 위 설정의 이유를 다시 본다.
            List<LogRecord> warnings = captureBaggageParserWarnings(() -> extractInScope(context,
                    Map.of("traceparent", TRACEPARENT, "baggage", invalidBaggage()), tracer -> { }));
            assertThat(warnings).extracting(LogRecord::getMessage).hasSize(INVALID_MEMBERS);
        });
    }

    /** 들어온 헤더로 span 을 시작해 trace 가 이어지는지 확인하고, 그 span 안에서 검사를 돌린다. */
    private static void extractInScope(ApplicationContext context, Map<String, String> headers, Consumer<Tracer> inScope) {
        Propagator propagator = context.getBean(Propagator.class);
        Tracer tracer = context.getBean(Tracer.class);
        Span span = propagator.extract(headers, Map::get).name("inbound").start();
        try (Tracer.SpanInScope ignored = tracer.withSpan(span)) {
            assertThat(span.context().traceId()).isEqualTo(TRACE_ID);
            assertThat(span.context().parentId()).isEqualTo(PARENT_SPAN_ID);
            assertThat(tracer.currentSpan().context().traceId()).isEqualTo(TRACE_ID);
            inScope.accept(tracer);
        } finally {
            span.end();
        }
    }

    private static String invalidBaggage() {
        return String.join(",", Collections.nCopies(INVALID_MEMBERS, "a=%zz"));
    }

    private static List<LogRecord> captureBaggageParserWarnings(Runnable action) {
        Logger logger = Logger.getLogger(BAGGAGE_PARSER_LOGGER);
        List<LogRecord> records = new ArrayList<>();
        Handler handler = new Handler() {
            @Override
            public void publish(LogRecord record) {
                if (record.getLevel().intValue() >= Level.WARNING.intValue()) {
                    records.add(record);
                }
            }

            @Override
            public void flush() {
            }

            @Override
            public void close() {
            }
        };
        Level previous = logger.getLevel();
        logger.setLevel(Level.ALL);
        logger.addHandler(handler);
        try {
            action.run();
        } finally {
            logger.removeHandler(handler);
            logger.setLevel(previous);
        }
        return records;
    }

    private static String mainValue(String key) throws Exception {
        Path file = Path.of("src/main/resources/application.yml");
        if (!Files.exists(file)) {
            file = Path.of("api-server/src/main/resources/application.yml");
        }
        List<PropertySource<?>> sources = new YamlPropertySourceLoader().load("main", new FileSystemResource(file));
        Object value = sources.get(0).getProperty(key);
        assertThat(value).as("%s 가 %s 에 없다", key, file).isNotNull();
        return value.toString();
    }
}
