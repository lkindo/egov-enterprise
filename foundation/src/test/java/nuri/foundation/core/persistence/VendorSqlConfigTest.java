package nuri.foundation.core.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class VendorSqlConfigTest {

    @Test
    @DisplayName("postgresql 은 PostgreSQL 구현을 고른다")
    void selectsPostgres() {
        assertThat(new VendorSqlConfig().vendorSqlDialect("postgresql")).isInstanceOf(PostgresqlSqlDialect.class);
    }

    @Test
    @DisplayName("모르는 벤더는 기본값으로 넘기지 않고 기동을 멈춘다")
    void rejectsUnknownVendor() {
        assertThatThrownBy(() -> new VendorSqlConfig().vendorSqlDialect("oracle"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("oracle");
    }
}
