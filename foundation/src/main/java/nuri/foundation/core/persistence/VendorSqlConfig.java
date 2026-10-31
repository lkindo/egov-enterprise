package nuri.foundation.core.persistence;

import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** {@code app.database.vendor} 로 SQL 구현을 고른다. 모르는 값은 기본값으로 넘기지 않고 기동을 멈춘다(ADR-0047). */
@Configuration
public class VendorSqlConfig {

    private static final String POSTGRESQL = "postgresql";
    private static final String ORACLE = "oracle";

    @Bean
    public VendorSqlDialect vendorSqlDialect(@Value("${app.database.vendor:postgresql}") String vendor) {
        if (POSTGRESQL.equals(vendor)) {
            return new PostgresqlSqlDialect();
        }
        if (ORACLE.equals(vendor)) {
            return new OracleSqlDialect();
        }
        throw new IllegalStateException("Unsupported app.database.vendor: " + vendor);
    }

    @Bean
    @ConditionalOnProperty(name = "app.database.vendor", havingValue = ORACLE)
    static BeanPostProcessor oracleIsolationMapping() {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessAfterInitialization(Object bean, String beanName) {
                return bean instanceof DataSource dataSource && !(bean instanceof IsolationMappingDataSource)
                        ? new IsolationMappingDataSource(dataSource) : bean;
            }
        };
    }
}
