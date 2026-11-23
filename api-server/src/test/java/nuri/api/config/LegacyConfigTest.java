package nuri.api.config;

import nuri.foundation.core.config.ProjectCryptoConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.BeanCreationException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.util.TestPropertyValues;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.context.support.PropertySourcesPlaceholderConfigurer;
import org.springframework.core.NestedExceptionUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("LegacyConfig placeholder fail-fast 설정 테스트")
class LegacyConfigTest {

    @Configuration
    static class PlaceholderBeanConfig {

        @Bean
        static PropertySourcesPlaceholderConfigurer propertySourcesPlaceholderConfigurer() {
            return LegacyConfig.propertySourcesPlaceholderConfigurer();
        }
    }

    @Configuration
    static class UnresolvableValueBean {

        @Value("${UNRESOLVABLE_LEGACY_TEST_KEY}")
        String requiredValue;
    }

    @Configuration
    static class ResolvableValueBean {

        @Value("${RESOLVABLE_LEGACY_TEST_KEY}")
        String requiredValue;
    }

    @Configuration
    @Import(ProjectCryptoConfig.class)
    static class CryptoWithPlaceholderConfig {

        @Bean
        static PropertySourcesPlaceholderConfigurer propertySourcesPlaceholderConfigurer() {
            return LegacyConfig.propertySourcesPlaceholderConfigurer();
        }
    }

    @Test
    @DisplayName("미해결 플레이스홀더(${...})가 있으면 컨텍스트 기동이 즉시 실패한다")
    void failsFastWhenPlaceholderIsUnresolvable() {
        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext()) {
            context.register(PlaceholderBeanConfig.class, UnresolvableValueBean.class);

            assertThatThrownBy(context::refresh)
                    .isInstanceOf(BeanCreationException.class)
                    .satisfies(ex -> assertThat(NestedExceptionUtils.getMostSpecificCause(ex).getMessage())
                            .contains("UNRESOLVABLE_LEGACY_TEST_KEY"));
        }
    }

    @Test
    @DisplayName("prod 프로파일에서 Globals.File.algorithmKey가 미해결 플레이스홀더면 기동이 실패한다")
    void prodFailsFastWhenAlgorithmKeyPlaceholderIsUnresolvable() {
        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext()) {
            context.getEnvironment().setActiveProfiles("prod");
            TestPropertyValues.of("Globals.File.algorithmKey=${MISSING_PROD_ALGORITHM_KEY}")
                    .applyTo(context);
            context.register(CryptoWithPlaceholderConfig.class);

            assertThatThrownBy(context::refresh)
                    .isInstanceOf(BeanCreationException.class)
                    .satisfies(ex -> assertThat(NestedExceptionUtils.getMostSpecificCause(ex).getMessage())
                            .contains("MISSING_PROD_ALGORITHM_KEY"));
        }
    }

    @Test
    @DisplayName("정의된 프로퍼티는 정상 해석되어 컨텍스트가 기동된다")
    void refreshesWhenPlaceholderResolves() {
        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext()) {
            TestPropertyValues.of("RESOLVABLE_LEGACY_TEST_KEY=resolved-value")
                    .applyTo(context);
            context.register(PlaceholderBeanConfig.class, ResolvableValueBean.class);
            context.refresh();

            assertThat(context.getBean(ResolvableValueBean.class).requiredValue)
                    .isEqualTo("resolved-value");
        }
    }
}
