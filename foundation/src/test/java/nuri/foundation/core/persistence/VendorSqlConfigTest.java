package nuri.foundation.core.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import javax.sql.DataSource;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.config.BeanPostProcessor;

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
    @DisplayName("모르는 벤더는 기본값으로 넘기지 않고 기동을 멈춘다")
    void rejectsUnknownVendor() {
        assertThatThrownBy(() -> new VendorSqlConfig().vendorSqlDialect("db2"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("db2");
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
}
