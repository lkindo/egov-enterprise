package com.company.project;

import com.company.project.foundation.core.config.FullBeanNameGenerator;
import com.company.project.foundation.core.config.QuerydslConfig;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;

@SpringBootApplication(nameGenerator = FullBeanNameGenerator.class)
@ComponentScan(basePackages = "com.company.project", nameGenerator = FullBeanNameGenerator.class, excludeFilters = {
        @ComponentScan.Filter(type = FilterType.REGEX, pattern = ".*Test$"),
        @ComponentScan.Filter(type = FilterType.REGEX, pattern = ".*Test.*Config.*"),
        @ComponentScan.Filter(type = FilterType.REGEX, pattern = ".*ConfigTest.*"),
        @ComponentScan.Filter(type = FilterType.ANNOTATION, classes = { org.springframework.boot.test.context.TestConfiguration.class }),
        @ComponentScan.Filter(type = FilterType.REGEX, pattern = "com\\.company\\.project\\.api\\.config\\.ApiSecurityConfig")
})
@Import({QuerydslConfig.class})
public class TestApplication {
}

