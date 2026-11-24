package nuri.api.config;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.beans.factory.InitializingBean;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.CompositePropertySource;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.EnumerablePropertySource;
import org.springframework.core.env.PropertySource;
import org.springframework.stereotype.Component;

/**
 * prod 프로파일 기동 시 미해결 환경변수 플레이스홀더(${...})나 공백으로 남은 필수 설정을 차단한다.
 * {@code @ConfigurationProperties}와 {@code @Value} 양쪽 모두에서 조용히 리터럴 문자열이 바인딩되는 사고를 방지한다.
 */
@Component
@Profile("prod & !test")
public class ProdRequiredPropertiesGuard implements InitializingBean {

    private static final List<String> REQUIRED_PROD_KEYS = List.of(
            "spring.mail.host",
            "spring.datasource.url",
            "spring.datasource.jdbc-url",
            "spring.datasource.username",
            "spring.datasource.password",
            "Globals.File.algorithmKey",
            "jwt.secret",
            "jwt.signing.active-kid",
            "jwt.signing.keys-json"
    );

    private static final Pattern UNRESOLVED_PLACEHOLDER_PATTERN = Pattern.compile("\\$\\{[^}]+}");

    private final ConfigurableEnvironment environment;

    public ProdRequiredPropertiesGuard(ConfigurableEnvironment environment) {
        this.environment = environment;
    }

    @Override
    public void afterPropertiesSet() {
        validate();
    }

    void validate() {
        Set<String> missingOrUnresolved = new LinkedHashSet<>();

        for (String key : REQUIRED_PROD_KEYS) {
            if (isMissingOrUnresolved(key, true)) {
                missingOrUnresolved.add(key);
            }
        }

        for (PropertySource<?> propertySource : flattenPropertySources()) {
            if (!(propertySource instanceof EnumerablePropertySource<?> enumerableSource)) {
                continue;
            }
            if (!isProdPropertySource(propertySource.getName())) {
                continue;
            }
            for (String propertyName : enumerableSource.getPropertyNames()) {
                Object rawValue = enumerableSource.getProperty(propertyName);
                if (rawValue instanceof String rawString
                        && UNRESOLVED_PLACEHOLDER_PATTERN.matcher(rawString).find()
                        && isMissingOrUnresolved(propertyName, false)) {
                    missingOrUnresolved.add(propertyName);
                }
            }
        }

        if (!missingOrUnresolved.isEmpty()) {
            // 비밀 값이 예외 메시지와 로그에 노출되지 않도록 프로퍼티 키 이름만 기록한다.
            throw new IllegalStateException(
                    "Missing or unresolved required prod configuration properties: "
                            + String.join(", ", missingOrUnresolved)
            );
        }
    }

    private boolean isMissingOrUnresolved(String key, boolean rejectBlank) {
        String resolved;
        try {
            resolved = environment.getProperty(key);
        } catch (IllegalArgumentException ex) {
            return true;
        }
        if (resolved == null) {
            return true;
        }
        if (rejectBlank && resolved.isBlank()) {
            return true;
        }
        return UNRESOLVED_PLACEHOLDER_PATTERN.matcher(resolved).find();
    }

    private static boolean isProdPropertySource(String sourceName) {
        return sourceName != null && sourceName.toLowerCase(Locale.ROOT).contains("application-prod");
    }

    private List<PropertySource<?>> flattenPropertySources() {
        List<PropertySource<?>> flattened = new ArrayList<>();
        for (PropertySource<?> propertySource : environment.getPropertySources()) {
            collectPropertySource(propertySource, flattened);
        }
        return flattened;
    }

    private static void collectPropertySource(PropertySource<?> propertySource, List<PropertySource<?>> sink) {
        if (propertySource instanceof CompositePropertySource composite) {
            for (PropertySource<?> nested : composite.getPropertySources()) {
                collectPropertySource(nested, sink);
            }
            return;
        }
        sink.add(propertySource);
    }
}
