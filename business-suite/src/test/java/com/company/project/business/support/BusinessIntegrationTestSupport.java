package com.company.project.business.support;

import com.company.project.business.TestApplication;
import com.company.project.foundation.security.config.TestSecurityConfig;
import com.company.project.foundation.core.config.TestMessagingConfig;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(classes = TestApplication.class)
@Import({ TestSecurityConfig.class, TestMessagingConfig.class })
@Transactional
@ActiveProfiles("test")
public abstract class BusinessIntegrationTestSupport {
}
