package nuri.foundation.core.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.sql.Types;
import java.util.ServiceLoader;
import org.hibernate.dialect.DatabaseVersion;
import org.hibernate.engine.jdbc.dialect.spi.DialectResolutionInfo;
import org.hibernate.engine.jdbc.dialect.spi.DialectResolver;
import org.hibernate.type.SqlTypes;
import org.hibernate.type.descriptor.jdbc.JsonJdbcType;
import org.hibernate.type.descriptor.jdbc.TimestampUtcAsJdbcTimestampJdbcType;
import org.hibernate.type.descriptor.jdbc.spi.JdbcTypeRegistry;
import org.hibernate.type.spi.TypeConfiguration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class NuriOracleDialectTest {

    private final NuriOracleDialect dialect = new NuriOracleDialect(DatabaseVersion.make(19));

    @ParameterizedTest
    @ValueSource(ints = {Types.VARCHAR, Types.NVARCHAR, Types.LONGVARCHAR, SqlTypes.JSON})
    @DisplayName("글자 수 1,000 을 넘는 문자열과 JSON 은 CLOB 컬럼에 맞는다 — 인자 순서가 바뀌어도 같다")
    void textMappingsMatchClobColumns(int mapped) {
        assertThat(dialect.equivalentTypes(mapped, Types.CLOB)).isTrue();
        assertThat(dialect.equivalentTypes(Types.CLOB, mapped)).isTrue();
    }

    @Test
    @DisplayName("이진 매핑은 BLOB 컬럼에 맞는다")
    void binaryMappingsMatchBlobColumns() {
        assertThat(dialect.equivalentTypes(Types.VARBINARY, Types.BLOB)).isTrue();
        assertThat(dialect.equivalentTypes(Types.BLOB, Types.VARBINARY)).isTrue();
    }

    @Test
    @DisplayName("문자·이진이 아닌 매핑은 스키마 검증을 그대로 받는다 — 허용을 넓히지 않는다")
    void unrelatedTypesStayDifferent() {
        assertThat(dialect.equivalentTypes(Types.INTEGER, Types.CLOB)).isFalse();
        assertThat(dialect.equivalentTypes(Types.TIMESTAMP, Types.BLOB)).isFalse();
        assertThat(dialect.equivalentTypes(Types.VARCHAR, Types.BLOB)).isFalse();
    }

    @Test
    @DisplayName("네이티브 조회의 CLOB 은 문자열로 읽는다 — 투영이 String 을 받는다")
    void nativeClobResultsAreReadAsText() {
        JdbcTypeRegistry registry = new TypeConfiguration().getJdbcTypeRegistry();

        assertThat(dialect.resolveSqlTypeDescriptor("CLOB", Types.CLOB, 0, 0, registry).getJdbcTypeCode())
                .isEqualTo(Types.LONGVARCHAR);
        assertThat(dialect.resolveSqlTypeDescriptor("NCLOB", Types.NCLOB, 0, 0, registry).getJdbcTypeCode())
                .isEqualTo(Types.LONGVARCHAR);
        assertThat(dialect.resolveSqlTypeDescriptor("VARCHAR2", Types.VARCHAR, 100, 0, registry).getJdbcTypeCode())
                .isEqualTo(Types.VARCHAR);
    }

    @Test
    @DisplayName("Instant 는 시간대 없는 컬럼에 UTC 기준으로 읽고 쓴다 — JVM 시간대가 바뀌어도 같은 순간이다")
    void instantsUseAPlainTimestamp() {
        JdbcTypeRegistry registry = new TypeConfiguration().getJdbcTypeRegistry();

        NuriOracleDialect.applyStoredTypes(registry);

        assertThat(registry.getDescriptor(SqlTypes.TIMESTAMP_UTC)).isSameAs(TimestampUtcAsJdbcTimestampJdbcType.INSTANCE);
        assertThat(registry.getDescriptor(SqlTypes.JSON)).isSameAs(JsonJdbcType.INSTANCE);
    }

    @Test
    @DisplayName("설정 없이 JDBC 제품명으로 이 방언을 고르고, 다른 제품은 표준 해석에 넘긴다")
    void resolvedFromTheConnectedProduct() {
        DialectResolutionInfo oracle = mock(DialectResolutionInfo.class, CALLS_REAL_METHODS);
        doReturn("Oracle").when(oracle).getDatabaseName();
        doReturn(19).when(oracle).getDatabaseMajorVersion();
        DialectResolutionInfo postgres = mock(DialectResolutionInfo.class);
        when(postgres.getDatabaseName()).thenReturn("PostgreSQL");

        NuriOracleDialectResolver resolver = new NuriOracleDialectResolver();

        assertThat(resolver.resolveDialect(oracle)).isInstanceOf(NuriOracleDialect.class);
        assertThat(resolver.resolveDialect(postgres)).isNull();
        assertThat(ServiceLoader.load(DialectResolver.class)).anyMatch(NuriOracleDialectResolver.class::isInstance);
    }
}
