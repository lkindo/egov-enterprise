package nuri.business.support;

import nuri.TestApplication;
import nuri.foundation.security.config.TestSecurityConfig;
import nuri.foundation.core.config.TestMessagingConfig;
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
