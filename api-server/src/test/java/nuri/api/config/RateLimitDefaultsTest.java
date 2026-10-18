package nuri.api.config;

import nuri.business.security.filter.RateLimitFilter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.core.env.PropertySource;
import org.springframework.core.io.FileSystemResource;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 요청 제한 기본값이 설정 파일과 코드에서 같은지, E2E 프로파일만 한도를 올리는지 본다(2026-10-18).
 *
 * <p>기본값은 두 곳에 있다 — {@code application.yml} 의 {@code ${RATE_LIMIT_..:N}} 과 {@link RateLimitFilter} 의 {@code @Value}
 * 기본값. 테스트 classpath 의 application.yml 이 main 을 가리므로 테스트 컨텍스트는 코드 기본값으로 돈다. 둘이 어긋나면
 * 테스트가 본 한도와 배포 한도가 다르다. E2E 는 모든 요청이 한 루프백 IP 에서 오므로 운영 기본값(IP 당 로그인 30)으로는 전체
 * 실행이 막힌다 — e2e 프로파일이 올린 값이 사라지면 CI E2E 가 429 로 무너지기 전에 여기서 알린다.
 */
@DisplayName("요청 제한 기본값")
class RateLimitDefaultsTest {

    private static final Pattern PLACEHOLDER = Pattern.compile("^\\$\\{([A-Z_]+):(\\d+)}$");

    @Test
    @DisplayName("application.yml 의 기본 한도가 RateLimitFilter 코드 기본값과 같다")
    void mainDefaultsMatchFilterDefaults() throws Exception {
        assertThat(placeholderDefault("application.yml", "nuri.security.rate-limit.requests-per-minute",
                "RATE_LIMIT_REQUESTS_PER_MINUTE"))
                .isEqualTo(RateLimitFilter.DEFAULT_REQUESTS_PER_MINUTE);
        assertThat(placeholderDefault("application.yml", "nuri.security.rate-limit.login-requests-per-minute",
                "RATE_LIMIT_LOGIN_REQUESTS_PER_MINUTE"))
                .as("로그인 한도 기본값이 코드와 설정에서 다르다")
                .isEqualTo(RateLimitFilter.DEFAULT_LOGIN_REQUESTS_PER_MINUTE);
    }

    @Test
    @DisplayName("운영 기본 로그인 한도는 비밀번호 대입을 막는 수준이다(IP 당 분당 60 이하)")
    void loginDefaultStopsPasswordSpraying() {
        assertThat(RateLimitFilter.DEFAULT_LOGIN_REQUESTS_PER_MINUTE)
                .as("IP 당 분당 로그인 한도가 다시 커졌다 — 한 IP 가 여러 계정에 비밀번호를 뿌리는 공격이 열린다")
                .isBetween(1, 60);
    }

    @Test
    @DisplayName("e2e 프로파일은 한 루프백 IP 에서 오는 전체 실행을 위해 로그인 한도를 따로 올린다")
    void e2eProfileRaisesTheLoopbackLimit() throws Exception {
        int login = placeholderDefault("application-e2e.yml", "nuri.security.rate-limit.login-requests-per-minute",
                "RATE_LIMIT_LOGIN_REQUESTS_PER_MINUTE");
        assertThat(login).as("E2E 전체 실행의 로그인이 운영 기본 한도에 막힌다")
                .isGreaterThan(RateLimitFilter.DEFAULT_LOGIN_REQUESTS_PER_MINUTE * 10);
        assertThat(placeholderDefault("application-e2e.yml", "nuri.security.rate-limit.requests-per-minute",
                "RATE_LIMIT_REQUESTS_PER_MINUTE"))
                .isGreaterThanOrEqualTo(RateLimitFilter.DEFAULT_REQUESTS_PER_MINUTE);
    }

    private static int placeholderDefault(String fileName, String key, String environmentVariable) throws Exception {
        Path file = Path.of("src/main/resources", fileName);
        if (!Files.exists(file)) {
            file = Path.of("api-server/src/main/resources", fileName);
        }
        List<PropertySource<?>> sources = new YamlPropertySourceLoader().load(fileName, new FileSystemResource(file));
        Object value = sources.stream().map(source -> source.getProperty(key)).filter(java.util.Objects::nonNull)
                .findFirst().orElse(null);
        assertThat(value).as("%s 가 %s 에 없다", key, file).isNotNull();
        Matcher matcher = PLACEHOLDER.matcher(value.toString());
        assertThat(matcher.matches()).as("%s 는 ${%s:<숫자>} 형태여야 한다: %s", key, environmentVariable, value).isTrue();
        assertThat(matcher.group(1)).isEqualTo(environmentVariable);
        return Integer.parseInt(matcher.group(2));
    }
}
