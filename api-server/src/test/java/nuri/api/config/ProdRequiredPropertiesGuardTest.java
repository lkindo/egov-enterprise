package nuri.api.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.mock.env.MockEnvironment;

class ProdRequiredPropertiesGuardTest {

    private final YamlPropertySourceLoader yamlLoader = new YamlPropertySourceLoader();

    @Test
    void missingMailHostFailsWithPropertyKeyOnlyAndNoSecretLeak() throws IOException {
        Map<String, Object> envVars = completeProdEnvVars();
        envVars.remove("MAIL_HOST");

        MockEnvironment environment = buildProdEnvironment(envVars, Map.of());
        ProdRequiredPropertiesGuard guard = new ProdRequiredPropertiesGuard(environment);

        assertThatThrownBy(guard::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("spring.mail.host")
                .hasMessageNotContaining("super-secret-db-password")
                .hasMessageNotContaining("super-secret-jwt-value")
                .hasMessageNotContaining("super-secret-algorithm-key");
    }

    @Test
    void blankPasswordAndMissingDbUrlFailWithExactKeys() throws IOException {
        Map<String, Object> envVars = completeProdEnvVars();
        envVars.put("DB_PASSWORD", "   ");
        envVars.remove("DB_URL");

        MockEnvironment environment = buildProdEnvironment(envVars, Map.of());
        ProdRequiredPropertiesGuard guard = new ProdRequiredPropertiesGuard(environment);

        assertThatThrownBy(guard::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("spring.datasource.url")
                .hasMessageContaining("spring.datasource.jdbc-url")
                .hasMessageContaining("spring.datasource.password");
    }

    /** [2026-11-25] 운영은 주민등록번호 키링이 없으면 기동하지 않는다 — 비우면 종전 ARIA 결정적 암호로 새 값을 쓰던 경로다. */
    @Test
    void missingRrnoKeyringFailsWithBothKeyNamesAndNoSecretLeak() throws IOException {
        Map<String, Object> envVars = completeProdEnvVars();
        envVars.remove("RRNO_ACTIVE_KEY_ID");
        envVars.put("RRNO_KEYS_JSON", " ");

        MockEnvironment environment = buildProdEnvironment(envVars, Map.of());
        ProdRequiredPropertiesGuard guard = new ProdRequiredPropertiesGuard(environment);

        assertThatThrownBy(guard::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("nuri.crypto.rrno.active-key-id")
                .hasMessageContaining("nuri.crypto.rrno.keys-json")
                .hasMessageNotContaining("super-secret");
    }

    /** ADR-0060 2차 뒤 운영은 HMAC 서명 비밀을 요구하지 않는다 — JWT_SECRET 없이 기동한다. */
    @Test
    void prodNoLongerRequiresHmacSecret() throws IOException {
        Map<String, Object> envVars = completeProdEnvVars();
        assertThat(envVars).doesNotContainKey("JWT_SECRET");
        MockEnvironment environment = buildProdEnvironment(envVars, Map.of());
        assertThat(environment.getProperty("jwt.secret")).isNull();
        assertThatCode(new ProdRequiredPropertiesGuard(environment)::validate).doesNotThrowAnyException();
    }

    @Test
    void unresolvedExtraPlaceholderInProdSourceFailsWithKeyName() throws IOException {
        Map<String, Object> envVars = completeProdEnvVars();
        MockEnvironment environment = buildProdEnvironment(
                envVars,
                Map.of("custom.prod.endpoint", "${EXTRA_PROD_VAR}")
        );
        ProdRequiredPropertiesGuard guard = new ProdRequiredPropertiesGuard(environment);

        assertThatThrownBy(guard::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("custom.prod.endpoint");
    }

    @Test
    void completeProdConfigurationPasses() throws IOException {
        MockEnvironment environment = buildProdEnvironment(completeProdEnvVars(), Map.of());
        ProdRequiredPropertiesGuard guard = new ProdRequiredPropertiesGuard(environment);

        assertThatCode(guard::validate).doesNotThrowAnyException();
    }

    @Test
    void testAndProdProfilesDoNotRegisterGuardWhileProdAloneFailsStartupWithoutMailHost() {
        new ApplicationContextRunner()
                .withUserConfiguration(ProdRequiredPropertiesGuard.class)
                .withInitializer(context -> {
                    ConfigurableEnvironment environment = context.getEnvironment();
                    environment.setActiveProfiles("test", "prod");
                    loadProdYaml(environment);
                })
                .run(context -> {
                    assertThat(context).hasNotFailed();
                    assertThat(context).doesNotHaveBean(ProdRequiredPropertiesGuard.class);
                });

        Map<String, Object> missingMailHostEnv = completeProdEnvVars();
        missingMailHostEnv.remove("MAIL_HOST");

        new ApplicationContextRunner()
                .withUserConfiguration(ProdRequiredPropertiesGuard.class)
                .withInitializer(context -> {
                    ConfigurableEnvironment environment = context.getEnvironment();
                    environment.setActiveProfiles("prod");
                    loadProdYaml(environment);
                    environment.getPropertySources().addFirst(new MapPropertySource("testEnv", missingMailHostEnv));
                })
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context.getStartupFailure())
                            .hasRootCauseInstanceOf(IllegalStateException.class)
                            .hasRootCauseMessage(
                                    "Missing or unresolved required prod configuration properties: spring.mail.host"
                            );
                });
    }

    private MockEnvironment buildProdEnvironment(
            Map<String, Object> envVars,
            Map<String, Object> extraProdProperties
    ) throws IOException {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("prod");
        if (!envVars.isEmpty()) {
            environment.getPropertySources().addFirst(new MapPropertySource("envVars", envVars));
        }
        if (!extraProdProperties.isEmpty()) {
            environment.getPropertySources().addLast(
                    new MapPropertySource("Config resource 'class path resource [application-prod-extra.yml]'", extraProdProperties)
            );
        }
        loadYamlSources(environment, "application-prod", "application-prod.yml");
        loadYamlSources(environment, "application", "application.yml");
        return environment;
    }

    private void loadProdYaml(ConfigurableEnvironment environment) {
        try {
            loadYamlSources(environment, "application-prod", "application-prod.yml");
            loadYamlSources(environment, "application", "application.yml");
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to load YAML test fixtures", ex);
        }
    }

    private void loadYamlSources(ConfigurableEnvironment environment, String name, String location) throws IOException {
        Path direct = Path.of("src/main/resources", location);
        Path fromRoot = Path.of("api-server/src/main/resources", location);
        Path resolved = Files.isRegularFile(direct) ? direct : fromRoot;
        List<PropertySource<?>> loaded = yamlLoader.load(name, new FileSystemResource(resolved));
        for (PropertySource<?> source : loaded) {
            environment.getPropertySources().addLast(source);
        }
    }

    /** 운영은 보호계정 MFA 가 기본 강제되므로 전환 유예를 명시(false)하지 않으면 MFA 키링 두 키가 모두 필요하다(ADR-0054). */
    @Test
    void missingMfaKeyringWhenRequireProtectedDefaultTrueFailsWithoutSecretLeak() throws IOException {
        Map<String, Object> envVars = completeProdEnvVars();
        envVars.remove("MFA_ACTIVE_KEY_ID");
        envVars.put("MFA_KEYS_JSON", " ");

        MockEnvironment environment = buildProdEnvironment(envVars, Map.of());
        ProdRequiredPropertiesGuard guard = new ProdRequiredPropertiesGuard(environment);

        assertThatThrownBy(guard::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("nuri.security.mfa.active-key-id")
                .hasMessageContaining("nuri.security.mfa.keys-json")
                .hasMessageNotContaining("super-secret");
    }

    @Test
    void mfaRequireProtectedFalseAllowsOmittedMfaKeyringForGracePeriod() throws IOException {
        Map<String, Object> envVars = completeProdEnvVars();
        envVars.put("MFA_REQUIRE_PROTECTED", "false");
        envVars.remove("MFA_ACTIVE_KEY_ID");
        envVars.remove("MFA_KEYS_JSON");

        MockEnvironment environment = buildProdEnvironment(envVars, Map.of());
        assertThatCode(new ProdRequiredPropertiesGuard(environment)::validate).doesNotThrowAnyException();
    }

    @Test
    void invalidMfaRequireProtectedValueFailsStartup() throws IOException {
        Map<String, Object> envVars = completeProdEnvVars();
        envVars.put("MFA_REQUIRE_PROTECTED", "flase");

        MockEnvironment environment = buildProdEnvironment(envVars, Map.of());
        ProdRequiredPropertiesGuard guard = new ProdRequiredPropertiesGuard(environment);

        assertThatThrownBy(guard::validate)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("nuri.security.mfa.require-protected");
    }

    private static Map<String, Object> completeProdEnvVars() {
        Map<String, Object> vars = new HashMap<>();
        vars.put("MAIL_HOST", "smtp.example.com");
        vars.put("DB_URL", "jdbc:postgresql://localhost:5432/egov");
        vars.put("DB_USERNAME", "egov_app");
        vars.put("DB_PASSWORD", "super-secret-db-password");
        vars.put("ALGORITHM_KEY", "super-secret-algorithm-key");
        vars.put("JWT_SIGNING_ACTIVE_KID", "prod-kid-1");
        vars.put("JWT_SIGNING_KEYS_JSON", "[{\"kid\":\"prod-kid-1\",\"secret\":\"super-secret-jwt-value\"}]");
        vars.put("RRNO_ACTIVE_KEY_ID", "rrno-1");
        vars.put("RRNO_KEYS_JSON", "{\"rrno-1\":\"super-secret-rrno-key\"}");
        vars.put("MFA_ACTIVE_KEY_ID", "mfa-1");
        vars.put("MFA_KEYS_JSON", "{\"mfa-1\":\"super-secret-mfa-key\"}");
        return vars;
    }
}
