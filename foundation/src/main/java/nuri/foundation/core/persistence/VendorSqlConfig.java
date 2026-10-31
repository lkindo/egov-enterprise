package nuri.foundation.core.persistence;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** {@code app.database.vendor} 로 SQL 구현을 고른다. 모르는 값은 기본값으로 넘기지 않고 기동을 멈춘다(ADR-0047). */
@Configuration
public class VendorSqlConfig {

    private static final String POSTGRESQL = "postgresql";

    @Bean
    public VendorSqlDialect vendorSqlDialect(@Value("${app.database.vendor:postgresql}") String vendor) {
        if (POSTGRESQL.equals(vendor)) {
            return new PostgresqlSqlDialect();
        }
        throw new IllegalStateException("Unsupported app.database.vendor: " + vendor);
    }
}
