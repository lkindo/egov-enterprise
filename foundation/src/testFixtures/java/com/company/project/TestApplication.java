package com.company.project;

import com.company.project.foundation.core.config.FullBeanNameGenerator;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.AutoConfigurationExcludeFilter;
import org.springframework.boot.context.TypeExcludeFilter;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;

@SpringBootApplication(nameGenerator = FullBeanNameGenerator.class)
@ComponentScan(basePackages = "com.company.project", nameGenerator = FullBeanNameGenerator.class, excludeFilters = {
        @ComponentScan.Filter(type = FilterType.CUSTOM, classes = TypeExcludeFilter.class),
        @ComponentScan.Filter(type = FilterType.CUSTOM, classes = AutoConfigurationExcludeFilter.class),
        @ComponentScan.Filter(type = FilterType.REGEX, pattern = ".*Test$"),
        @ComponentScan.Filter(type = FilterType.REGEX, pattern = ".*Test.*Config.*"),
        @ComponentScan.Filter(type = FilterType.REGEX, pattern = ".*ConfigTest.*"),
        @ComponentScan.Filter(type = FilterType.ANNOTATION, classes = { org.springframework.boot.test.context.TestConfiguration.class }),
        @ComponentScan.Filter(type = FilterType.ANNOTATION, classes = { SpringBootApplication.class }),
        @ComponentScan.Filter(type = FilterType.REGEX, pattern = "com\\.company\\.project\\.api\\.config\\.ApiSecurityConfig")
})
public class TestApplication {
}

