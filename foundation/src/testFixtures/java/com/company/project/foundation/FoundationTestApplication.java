package com.company.project.foundation;

import com.company.project.foundation.core.config.QuerydslConfig;
import com.company.project.foundation.core.config.TestCacheConfig;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Import;

@SpringBootApplication
@Import({QuerydslConfig.class, TestCacheConfig.class})
public class FoundationTestApplication {
}
