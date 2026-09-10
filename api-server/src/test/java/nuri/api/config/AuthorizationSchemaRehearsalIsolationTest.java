package nuri.api.config;

import java.util.regex.Pattern;
import nuri.ApiServerApplication;
import nuri.api.schema.AuthorizationSchemaRehearsalTestConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.core.type.filter.RegexPatternTypeFilter;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThat;

class AuthorizationSchemaRehearsalIsolationTest {
    @Test
    void actualApplicationScanExcludesTcFixtureWhileExplicitImportCanUseIt() {
        var scanner=new ClassPathScanningCandidateComponentProvider(true);
        var environment=new MockEnvironment();
        environment.setActiveProfiles("tc");
        scanner.setEnvironment(environment);
        for (var filter:ApiServerApplication.class.getAnnotation(ComponentScan.class).excludeFilters()) {
            if (filter.type()==FilterType.REGEX) {
                for (String pattern:filter.pattern()) scanner.addExcludeFilter(new RegexPatternTypeFilter(Pattern.compile(pattern)));
            }
        }
        assertThat(scanner.findCandidateComponents("nuri.api.schema"))
                .noneMatch(bean -> AuthorizationSchemaRehearsalTestConfiguration.class.getName().equals(bean.getBeanClassName()));

        new ApplicationContextRunner().withUserConfiguration(AuthorizationSchemaRehearsalTestConfiguration.class)
                .withPropertyValues("spring.profiles.active=tc","spring.datasource.url=jdbc:tc:postgresql:17:///fixture")
                .run(context -> assertThat(context).hasBean("authorizationTestCutover"));
    }

    @Test
    void explicitFixtureImportStillCannotActivateInOrdinaryTestOrProductionProfiles() {
        for (String profile:new String[]{"test","prod"}) {
            new ApplicationContextRunner().withUserConfiguration(AuthorizationSchemaRehearsalTestConfiguration.class)
                    .withPropertyValues("spring.profiles.active="+profile,"spring.datasource.url=jdbc:h2:mem:fixture")
                    .run(context -> assertThat(context).doesNotHaveBean("authorizationTestCutover"));
        }
        new ApplicationContextRunner().withUserConfiguration(AuthorizationSchemaRehearsalTestConfiguration.class)
                .withPropertyValues("spring.profiles.active=tc","spring.datasource.url=jdbc:h2:mem:fixture")
                .run(context -> assertThat(context).hasFailed());
    }
}
