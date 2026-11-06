package nuri.foundation.core.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.Connection;
import javax.sql.DataSource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mockito;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.jdbc.datasource.IsolationLevelDataSourceAdapter;

class VendorSqlConfigTest {

    @Test
    @DisplayName("postgresql 은 PostgreSQL 구현을 고른다")
    void selectsPostgres() {
        assertThat(new VendorSqlConfig().vendorSqlDialect("postgresql")).isInstanceOf(PostgresqlSqlDialect.class);
    }

    @Test
    @DisplayName("oracle 은 Oracle 구현을 고른다")
    void selectsOracle() {
        assertThat(new VendorSqlConfig().vendorSqlDialect("oracle")).isInstanceOf(OracleSqlDialect.class);
    }

    @Test
    @DisplayName("mariadb 와 mysql 은 각자의 구현을 고른다 — 같은 InnoDB 기반이어도 잠금 상한·upsert·오류 번호가 다르다")
    void selectsMariaDbAndMySql() {
        assertThat(new VendorSqlConfig().vendorSqlDialect("mariadb")).isExactlyInstanceOf(MariaDbSqlDialect.class);
        assertThat(new VendorSqlConfig().vendorSqlDialect("mysql")).isExactlyInstanceOf(MySqlSqlDialect.class);
    }

    @Test
    @DisplayName("mssql 은 SQL Server 구현을 고른다")
    void selectsSqlServer() {
        assertThat(new VendorSqlConfig().vendorSqlDialect("mssql")).isExactlyInstanceOf(SqlServerSqlDialect.class);
    }

    @Test
    @DisplayName("SQL Server 는 REPEATABLE READ 를 스냅숏 격리로 바꾸는 DataSource 로 한 번만 감싼다")
    void sqlServerMapsRepeatableReadToSnapshotOnce() throws Exception {
        BeanPostProcessor processor = VendorSqlConfig.sqlServerIsolationMapping();
        DataSource source = mock(DataSource.class);
        Connection connection = mock(Connection.class);
        when(source.getConnection()).thenReturn(connection);

        Object wrapped = processor.postProcessAfterInitialization(source, "dataSource");
        ((DataSource) wrapped).getConnection().setTransactionIsolation(Connection.TRANSACTION_REPEATABLE_READ);

        verify(connection).setTransactionIsolation(IsolationMappingDataSource.SQL_SERVER_SNAPSHOT);
        assertThat(processor.postProcessAfterInitialization(wrapped, "dataSource")).isSameAs(wrapped);
    }

    @Test
    @DisplayName("cubrid 는 CUBRID 구현을 고른다")
    void selectsCubrid() {
        assertThat(new VendorSqlConfig().vendorSqlDialect("cubrid")).isExactlyInstanceOf(CubridSqlDialect.class);
    }

    @Test
    @DisplayName("CUBRID 는 시작 전 Hikari 풀이 새 연결마다 세션 잠금 대기 상한을 걸게 하고, 그 풀을 JDBC 호환 계층으로 한 번 감싼다 — 기본은 무한 대기다")
    void cubridSetsThePoolSessionLockWait() throws Exception {
        try (HikariDataSource pool = new HikariDataSource()) {
            Object wrapped = VendorSqlConfig.cubridConnections().postProcessAfterInitialization(pool, "dataSource");

            assertThat(wrapped).isInstanceOf(CubridJdbcDataSource.class);
            assertThat(((DataSource) wrapped).unwrap(HikariDataSource.class)).isSameAs(pool);
            assertThat(pool.getConnectionInitSql()).isEqualTo("SET TRANSACTION LOCK TIMEOUT 5");
        }
    }

    @Test
    @DisplayName("이미 연 풀과 다른 DataSource 는 연결을 꺼낼 때마다 세션 설정을 걸고, 두 번 감싸지 않는다")
    void cubridWrapsOtherDataSourcesOnce() throws Exception {
        BeanPostProcessor processor = VendorSqlConfig.cubridConnections();
        DataSource source = mock(DataSource.class);
        Connection connection = mock(Connection.class);
        java.sql.Statement statement = mock(java.sql.Statement.class);
        when(source.getConnection()).thenReturn(connection);
        when(connection.createStatement()).thenReturn(statement);

        Object wrapped = processor.postProcessAfterInitialization(source, "dataSource");

        assertThat(wrapped).isInstanceOf(CubridJdbcDataSource.class);
        assertThat(((CubridJdbcDataSource) wrapped).getTargetDataSource()).isInstanceOf(SessionInitializingDataSource.class);
        ((DataSource) wrapped).getConnection().getAutoCommit();
        verify(connection).getAutoCommit();
        verify(statement).execute("SET TRANSACTION LOCK TIMEOUT 5");
        assertThat(processor.postProcessAfterInitialization(wrapped, "dataSource")).isSameAs(wrapped);
        Object other = new Object();
        assertThat(processor.postProcessAfterInitialization(other, "other")).isSameAs(other);
    }

    @Test
    @DisplayName("모르는 벤더는 기본값으로 넘기지 않고 기동을 멈춘다")
    void rejectsUnknownVendor() {
        assertThatThrownBy(() -> new VendorSqlConfig().vendorSqlDialect("db2"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("db2");
        assertThatThrownBy(() -> new VendorSqlConfig().vendorSqlDialect("MySQL"))
                .as("값은 원장의 벤더 id 그대로다").isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("oracle 은 DataSource 만 격리 변환으로 감싸고 두 번 감싸지 않는다")
    void oracleWrapsDataSourcesOnce() {
        BeanPostProcessor processor = VendorSqlConfig.oracleIsolationMapping();
        DataSource source = Mockito.mock(DataSource.class);

        Object wrapped = processor.postProcessAfterInitialization(source, "dataSource");

        assertThat(wrapped).isInstanceOf(IsolationMappingDataSource.class);
        assertThat(processor.postProcessAfterInitialization(wrapped, "dataSource")).isSameAs(wrapped);
        Object other = new Object();
        assertThat(processor.postProcessAfterInitialization(other, "other")).isSameAs(other);
    }

    @ParameterizedTest
    @ValueSource(strings = {"postgresql", "oracle", "mariadb", "mysql", "mssql", "cubrid"})
    @DisplayName("격리 수준 처리는 그 벤더에만 걸린다 — PostgreSQL 은 아무것도 걸지 않는다")
    void isolationHandlingIsVendorScoped(String vendor) {
        new ApplicationContextRunner().withUserConfiguration(VendorSqlConfig.class)
                .withPropertyValues("app.database.vendor=" + vendor)
                .run(context -> {
                    assertThat(context.containsBean("oracleIsolationMapping")).isEqualTo("oracle".equals(vendor));
                    assertThat(context.containsBean("sqlServerIsolationMapping")).isEqualTo("mssql".equals(vendor));
                    assertThat(context.containsBean("mariadbReadCommitted")).isEqualTo("mariadb".equals(vendor));
                    assertThat(context.containsBean("mysqlReadCommitted")).isEqualTo("mysql".equals(vendor));
                    assertThat(context.containsBean("cubridConnections")).isEqualTo("cubrid".equals(vendor));
                });
    }

    @Test
    @DisplayName("InnoDB 는 시작 전 Hikari 풀의 기본 격리를 READ COMMITTED 로 둔다 — 풀이 새 연결마다 걸고 반납 때 되돌린다")
    void innoDbSetsThePoolDefaultToReadCommitted() {
        for (BeanPostProcessor processor : new BeanPostProcessor[] {
                VendorSqlConfig.mariadbReadCommitted(), VendorSqlConfig.mysqlReadCommitted()}) {
            try (HikariDataSource pool = new HikariDataSource()) {
                Object processed = processor.postProcessAfterInitialization(pool, "dataSource");

                assertThat(processed).isSameAs(pool);
                assertThat(pool.getTransactionIsolation()).isEqualTo("TRANSACTION_READ_COMMITTED");
            }
        }
    }

    @Test
    @DisplayName("이미 연 풀과 다른 DataSource 는 연결을 꺼낼 때마다 READ COMMITTED 를 걸고, 두 번 감싸지 않는다")
    void innoDbWrapsOtherDataSourcesOnce() throws Exception {
        BeanPostProcessor processor = VendorSqlConfig.readCommittedByDefault();
        DataSource source = mock(DataSource.class);
        Connection connection = mock(Connection.class);
        when(source.getConnection()).thenReturn(connection);

        Object wrapped = processor.postProcessAfterInitialization(source, "dataSource");

        assertThat(wrapped).isInstanceOf(IsolationLevelDataSourceAdapter.class);
        assertThat(((DataSource) wrapped).getConnection()).isSameAs(connection);
        verify(connection).setTransactionIsolation(Connection.TRANSACTION_READ_COMMITTED);
        assertThat(processor.postProcessAfterInitialization(wrapped, "dataSource")).isSameAs(wrapped);
        Object other = new Object();
        assertThat(processor.postProcessAfterInitialization(other, "other")).isSameAs(other);

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:h2:mem:vendor_isolation;DB_CLOSE_DELAY=-1");
        try (HikariDataSource running = new HikariDataSource(config)) {
            assertThat(processor.postProcessAfterInitialization(running, "dataSource"))
                    .as("시작한 풀은 설정을 바꿀 수 없다").isInstanceOf(IsolationLevelDataSourceAdapter.class);
        }
    }
}
