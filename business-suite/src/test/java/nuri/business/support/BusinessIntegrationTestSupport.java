package nuri.business.support;

import nuri.business.TestApplication;
import nuri.business.security.config.TestSecurityConfig;
import nuri.business.core.config.TestMessagingConfig;
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
