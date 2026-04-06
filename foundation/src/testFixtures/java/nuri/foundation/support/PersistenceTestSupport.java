package nuri.foundation.support;

import nuri.foundation.core.config.QuerydslConfig;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
@Import(QuerydslConfig.class)
public abstract class PersistenceTestSupport {
}
