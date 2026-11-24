package nuri.api.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.zaxxer.hikari.HikariDataSource;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Timer;
import io.micrometer.core.instrument.observation.DefaultMeterObservationHandler;
import io.micrometer.observation.ObservationRegistry;
import io.micrometer.prometheusmetrics.PrometheusConfig;
import io.micrometer.prometheusmetrics.PrometheusMeterRegistry;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;
import javax.sql.DataSource;
import nuri.foundation.core.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.boot.jdbc.autoconfigure.metrics.DataSourcePoolMetricsAutoConfiguration;
import org.springframework.boot.micrometer.metrics.autoconfigure.MetricsAutoConfiguration;
import org.springframework.boot.micrometer.metrics.autoconfigure.export.prometheus.PrometheusMetricsExportAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.filter.ServerHttpObservationFilter;

/**
 * 골든 시그널(HTTP 5xx/지연·HikariCP 풀 타임아웃/대기) Prometheus 메트릭 결속 계약.
 *
 * <p>{@code config/observability/prometheus-alert-rules.yml} 의 가용성 경보가 참조하는
 * 메트릭 이름과 라벨 값({@code outcome="SERVER_ERROR"}, {@code pool="egov-hikaricp"})이
 * 실제 {@link ServerHttpObservationFilter}·{@link DataSourcePoolMetricsAutoConfiguration}·
 * {@link PrometheusMeterRegistry#scrape()} 경로로 노출됨을 고정한다.
 */
@DisplayName("골든 시그널 Prometheus 메트릭 scrape 결속 테스트")
class GoldenSignalMetricsTest {

    @Test
    @DisplayName("ServerHttpObservationFilter 는 HTTP 500 응답을 http_server_requests_seconds_count/sum (outcome=SERVER_ERROR) 으로 노출한다")
    void serverErrorIsScrapedWithServerErrorOutcomeAndSum() throws Exception {
        PrometheusMeterRegistry prometheus = new PrometheusMeterRegistry(PrometheusConfig.DEFAULT);
        prometheus.config().commonTags("application", "egov-enterprise");
        ObservationRegistry observationRegistry = ObservationRegistry.create();
        observationRegistry.observationConfig().observationHandler(new DefaultMeterObservationHandler(prometheus));

        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new ProbeController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .addFilters(new ServerHttpObservationFilter(observationRegistry))
                .build();

        mockMvc.perform(get("/probe/ok")).andExpect(status().isOk());
        mockMvc.perform(get("/probe/fail")).andExpect(status().isInternalServerError());

        Timer serverErrorTimer = prometheus.find("http.server.requests")
                .tag("outcome", "SERVER_ERROR")
                .tag("status", "500")
                .timer();
        assertThat(serverErrorTimer).isNotNull();
        assertThat(serverErrorTimer.count()).isEqualTo(1L);

        String scraped = prometheus.scrape();
        assertThat(scraped)
                .contains("http_server_requests_seconds_count")
                .contains("http_server_requests_seconds_sum")
                .contains("outcome=\"SERVER_ERROR\"")
                .contains("status=\"500\"")
                .contains("application=\"egov-enterprise\"");
    }

    @Test
    @DisplayName("LegacyConfig 식 @Primary HikariDataSource 에도 DataSourcePoolMetricsAutoConfiguration 이 pool=egov-hikaricp 메트릭을 바인딩한다")
    void hikariPoolMetricsAndTimeoutsAreScrapedWithConfiguredPoolName() throws Exception {
        String configuredPoolName = mainYamlProperty("spring.datasource.pool-name");
        assertThat(configuredPoolName).isEqualTo("egov-hikaricp");

        ApplicationContextRunner runner = new ApplicationContextRunner()
                .withConfiguration(AutoConfigurations.of(
                        MetricsAutoConfiguration.class,
                        PrometheusMetricsExportAutoConfiguration.class,
                        DataSourcePoolMetricsAutoConfiguration.class))
                .withUserConfiguration(PrimaryHikariConfig.class)
                .withPropertyValues(
                        "management.metrics.tags.application=egov-enterprise",
                        "management.prometheus.metrics.export.enabled=true",
                        "test.hikari.pool-name=" + configuredPoolName);

        runner.run(context -> {
            PrometheusMeterRegistry prometheus = context.getBean(PrometheusMeterRegistry.class);
            HikariDataSource pool = context.getBean(HikariDataSource.class);

            try (Connection held = pool.getConnection()) {
                assertThat(held.isValid(1)).isTrue();
                assertThatThrownBy(pool::getConnection)
                        .isInstanceOf(SQLException.class);
            }

            Counter timeoutCounter = prometheus.find("hikaricp.connections.timeout")
                    .tag("pool", "egov-hikaricp")
                    .counter();
            assertThat(timeoutCounter).isNotNull();
            assertThat(timeoutCounter.count()).isEqualTo(1.0);

            String scraped = prometheus.scrape();
            assertThat(scraped)
                    .contains("hikaricp_connections_timeout_total")
                    .contains("hikaricp_connections_pending")
                    .contains("hikaricp_connections_active")
                    .contains("hikaricp_connections_max")
                    .contains("pool=\"egov-hikaricp\"")
                    .contains("application=\"egov-enterprise\"");
        });
    }

    private static String mainYamlProperty(String key) throws Exception {
        Path file = Path.of("src/main/resources/application.yml");
        if (!Files.exists(file)) {
            file = Path.of("api-server/src/main/resources/application.yml");
        }
        List<PropertySource<?>> sources = new YamlPropertySourceLoader().load("main", new FileSystemResource(file));
        Object value = sources.get(0).getProperty(key);
        assertThat(value).as("%s 가 %s 에 없다", key, file).isNotNull();
        return value.toString();
    }

    @Configuration(proxyBeanMethods = false)
    static class PrimaryHikariConfig {

        @Bean(name = "dataSource")
        @Primary
        DataSource dataSource(org.springframework.core.env.Environment environment) {
            HikariDataSource dataSource = new HikariDataSource();
            dataSource.setPoolName(environment.getRequiredProperty("test.hikari.pool-name"));
            dataSource.setDriverClassName("org.h2.Driver");
            dataSource.setJdbcUrl("jdbc:h2:mem:golden_signal_pool;DB_CLOSE_DELAY=-1");
            dataSource.setUsername("sa");
            dataSource.setPassword("");
            dataSource.setMaximumPoolSize(1);
            dataSource.setMinimumIdle(1);
            dataSource.setConnectionTimeout(250);
            return dataSource;
        }
    }

    @RestController
    static class ProbeController {

        @GetMapping("/probe/ok")
        String ok() {
            return "ok";
        }

        @GetMapping("/probe/fail")
        String fail() {
            throw new IllegalStateException("synthetic probe failure");
        }
    }
}
