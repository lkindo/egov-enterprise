package nuri.api.config;

import java.util.List;

import io.micrometer.core.instrument.MeterRegistry;
import nuri.api.support.ApiHttpIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.core.env.Environment;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 전체 컨텍스트 테스트가 메트릭·추적을 밖으로 내보내지 않는가.
 *
 * <p>Boot 4 는 이 차단을 테스트 모듈({@code spring-boot-micrometer-metrics-test}·{@code -tracing-test})의
 * ContextCustomizer 로 한다. 그 모듈은 import 없이 클래스패스에만 있으면 동작하므로, test starter 를 좁히다가
 * 빠뜨려도 컴파일도 테스트도 실패하지 않는다 — 대신 테스트마다 OTLP·Prometheus registry 가 켜지고 OTLP 는
 * 기본 주소로 전송을 시도한다(2026-09-24 starter 축소 검토에서 확인). 그 조용한 변화를 여기서 고정한다.
 */
@ApiHttpIntegrationTest
@DisplayName("테스트 컨텍스트 — 메트릭·추적 export 차단")
class TestObservabilityIsolationIntegrationTest {

    @Autowired
    private Environment environment;

    @Autowired
    private ApplicationContext context;

    @Test
    @DisplayName("메트릭·추적 export 가 꺼져 있고 외부 전송 registry 가 없다")
    void metricsAndTracingExportAreDisabled() {
        assertThat(environment.getProperty("management.defaults.metrics.export.enabled")).isEqualTo("false");
        assertThat(environment.getProperty("management.tracing.export.enabled")).isEqualTo("false");

        List<String> registries = context.getBeansOfType(MeterRegistry.class).values().stream()
                .map(registry -> registry.getClass().getName())
                .toList();
        assertThat(registries).noneMatch(name -> name.endsWith("OtlpMeterRegistry") || name.endsWith("PrometheusMeterRegistry"));
    }
}
