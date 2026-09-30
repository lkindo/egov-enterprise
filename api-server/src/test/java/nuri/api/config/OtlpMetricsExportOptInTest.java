package nuri.api.config;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.boot.micrometer.metrics.autoconfigure.MetricsAutoConfiguration;
import org.springframework.boot.micrometer.metrics.autoconfigure.export.otlp.OtlpMetricsExportAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.FileSystemResource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * OTLP 메트릭 push 는 명시적으로 켠다(2026-09-30).
 *
 * <p>Boot 4 는 OTLP registry 가 classpath 에 있으면 {@code management.otlp.metrics.export.enabled} 기본값 true 로
 * push 를 시작한다. 테스트 컨텍스트는 테스트 모듈이 export 를 막으므로(TestObservabilityIsolationIntegrationTest)
 * 운영 설정의 효과는 전체 컨텍스트 테스트로 볼 수 없다. 그래서 운영 {@code application.yml} 의 원문 값을 읽어
 * 같은 자동 설정에 넣고 결과를 본다 — 키 이름이 틀리면(Boot 2 팬텀 키 [W1-12] 와 같은 형태) 기본값 쪽에서 red 다.
 */
@DisplayName("OTLP 메트릭 export — 운영 설정은 기본 꺼짐, 환경변수로만 켠다")
class OtlpMetricsExportOptInTest {

    private static final String KEY = "management.otlp.metrics.export.enabled";

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(MetricsAutoConfiguration.class, OtlpMetricsExportAutoConfiguration.class));

    @Test
    @DisplayName("운영 application.yml 값 그대로면 OTLP registry 가 없다")
    void mainConfigurationKeepsOtlpExportOff() throws Exception {
        String raw = mainValue(KEY);
        assertThat(raw).isEqualTo("${OTLP_METRICS_EXPORT_ENABLED:false}");
        runner.withPropertyValues(KEY + "=" + raw)
                .run(context -> assertThat(otlpRegistries(context)).isEmpty());
    }

    @Test
    @DisplayName("같은 값에 OTLP_METRICS_EXPORT_ENABLED=true 를 주면 registry 가 생긴다 — 키가 실제로 동작한다")
    void environmentVariableTurnsOtlpExportOn() throws Exception {
        String raw = mainValue(KEY);
        runner.withPropertyValues(KEY + "=" + raw, "OTLP_METRICS_EXPORT_ENABLED=true")
                .run(context -> assertThat(otlpRegistries(context)).hasSize(1));
    }

    @Test
    @DisplayName("설정이 없으면 Boot 기본값으로 켜진다 — 위 기본 꺼짐이 우연이 아님을 보이는 대조군")
    void bootDefaultWouldExport() {
        runner.run(context -> assertThat(otlpRegistries(context)).hasSize(1));
    }

    /** 컴파일 classpath 에 OTLP registry 타입이 없어(runtime 전이) 이름으로 판정한다 — TestObservabilityIsolationIntegrationTest 와 같다. */
    private static List<String> otlpRegistries(org.springframework.context.ApplicationContext context) {
        return context.getBeansOfType(MeterRegistry.class).values().stream()
                .map(registry -> registry.getClass().getName())
                .filter(name -> name.endsWith("OtlpMeterRegistry"))
                .toList();
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
