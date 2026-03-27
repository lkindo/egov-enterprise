package com.company.project.foundation;

import com.company.project.foundation.domain.config.QuerydslConfig;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Import;

@SpringBootApplication(scanBasePackages = "com.company.project")
@Import(QuerydslConfig.class)
public class TestApplication {
}
