package nuri.foundation;

import nuri.foundation.core.config.QuerydslConfig;
import nuri.foundation.core.config.TestCacheConfig;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Import;

@SpringBootApplication
@Import({QuerydslConfig.class, TestCacheConfig.class})
public class FoundationTestApplication {
}
