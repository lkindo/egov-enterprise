package nuri.foundation.core.persistence;

import com.zaxxer.hikari.HikariDataSource;
import java.sql.Connection;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.datasource.IsolationLevelDataSourceAdapter;

/** {@code app.database.vendor} 로 SQL 구현을 고른다. 모르는 값은 기본값으로 넘기지 않고 기동을 멈춘다(ADR-0047). */
@Configuration
public class VendorSqlConfig {

    private static final String POSTGRESQL = "postgresql";
    private static final String ORACLE = "oracle";
    private static final String MARIADB = "mariadb";
    private static final String MYSQL = "mysql";
    private static final String MSSQL = "mssql";
    private static final String CUBRID = "cubrid";

    @Bean
    public VendorSqlDialect vendorSqlDialect(@Value("${app.database.vendor:postgresql}") String vendor) {
        if (POSTGRESQL.equals(vendor)) {
            return new PostgresqlSqlDialect();
        }
        if (ORACLE.equals(vendor)) {
            return new OracleSqlDialect();
        }
        if (MARIADB.equals(vendor)) {
            return new MariaDbSqlDialect();
        }
        if (MYSQL.equals(vendor)) {
            return new MySqlSqlDialect();
        }
        if (MSSQL.equals(vendor)) {
            return new SqlServerSqlDialect();
        }
        if (CUBRID.equals(vendor)) {
            return new CubridSqlDialect();
        }
        throw new IllegalStateException("Unsupported app.database.vendor: " + vendor);
    }

    @Bean
    @ConditionalOnProperty(name = "app.database.vendor", havingValue = CUBRID)
    static BeanPostProcessor cubridSessionLockWait() {
        return sessionInitializedWith(CubridSqlDialect.SESSION_LOCK_WAIT_SQL);
    }

    /**
     * 연결을 열 때 세션 설정 하나를 건다. CUBRID 의 행 잠금 대기는 기본이 무한이고 세션 설정으로만 묶인다(CubridSqlDialect). 설정 파일 한 줄에
     * 기대면 빠졌을 때 오류 없이 무한히 기다리므로 코드가 건다.
     *
     * <p>시작 전의 Hikari 풀은 풀 설정으로 건다(새 연결마다 한 번). 그 밖의 DataSource 는 연결을 꺼낼 때마다 건다.
     */
    static BeanPostProcessor sessionInitializedWith(String sql) {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessAfterInitialization(Object bean, String beanName) {
                if (bean instanceof HikariDataSource pool && !pool.isRunning()) {
                    pool.setConnectionInitSql(sql);
                    return pool;
                }
                if (bean instanceof DataSource dataSource && !(bean instanceof SessionInitializingDataSource)) {
                    return new SessionInitializingDataSource(dataSource, sql);
                }
                return bean;
            }
        };
    }

    @Bean
    @ConditionalOnProperty(name = "app.database.vendor", havingValue = ORACLE)
    static BeanPostProcessor oracleIsolationMapping() {
        return repeatableReadAs(Connection.TRANSACTION_SERIALIZABLE);
    }

    @Bean
    @ConditionalOnProperty(name = "app.database.vendor", havingValue = MSSQL)
    static BeanPostProcessor sqlServerIsolationMapping() {
        return repeatableReadAs(IsolationMappingDataSource.SQL_SERVER_SNAPSHOT);
    }

    /** 호출부의 REPEATABLE READ(스냅숏 일관 조회)를 같은 뜻의 벤더 격리 수준으로 바꾼다(IsolationMappingDataSource). */
    static BeanPostProcessor repeatableReadAs(int isolation) {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessAfterInitialization(Object bean, String beanName) {
                return bean instanceof DataSource dataSource && !(bean instanceof IsolationMappingDataSource)
                        ? new IsolationMappingDataSource(dataSource, isolation) : bean;
            }
        };
    }

    @Bean
    @ConditionalOnProperty(name = "app.database.vendor", havingValue = MARIADB)
    static BeanPostProcessor mariadbReadCommitted() {
        return readCommittedByDefault();
    }

    @Bean
    @ConditionalOnProperty(name = "app.database.vendor", havingValue = MYSQL)
    static BeanPostProcessor mysqlReadCommitted() {
        return readCommittedByDefault();
    }

    /**
     * InnoDB 의 기본 격리 수준은 REPEATABLE READ 다. 그 스냅숏은 일반 읽기에만 걸리고 잠금 읽기·쓰기는 최신 행을 보며, 쓰기 충돌도
     * PostgreSQL 처럼 재시도 오류로 끝나지 않는다. 기본을 PostgreSQL 과 같은 READ COMMITTED 로 둔다(설계서 §5). 호출부가 명시한
     * REPEATABLE READ(읽기 전용 일관 조회)는 바꾸지 않는다.
     *
     * <p>시작 전의 Hikari 풀은 풀 설정으로 건다. 풀이 새 연결마다 걸고, 다른 수준으로 바꾼 연결은 반납 때 되돌린다. 그 밖의
     * DataSource 는 연결을 꺼낼 때마다 건다.
     */
    static BeanPostProcessor readCommittedByDefault() {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessAfterInitialization(Object bean, String beanName) {
                if (bean instanceof HikariDataSource pool && !pool.isRunning()) {
                    pool.setTransactionIsolation("TRANSACTION_READ_COMMITTED");
                    return pool;
                }
                if (bean instanceof DataSource dataSource && !(bean instanceof IsolationLevelDataSourceAdapter)) {
                    IsolationLevelDataSourceAdapter adapter = new IsolationLevelDataSourceAdapter();
                    adapter.setTargetDataSource(dataSource);
                    adapter.setIsolationLevel(Connection.TRANSACTION_READ_COMMITTED);
                    return adapter;
                }
                return bean;
            }
        };
    }
}
