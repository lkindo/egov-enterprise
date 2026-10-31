package nuri.foundation.core.persistence;

import java.sql.Types;
import org.hibernate.boot.model.TypeContributions;
import org.hibernate.dialect.DatabaseVersion;
import org.hibernate.dialect.OracleDialect;
import org.hibernate.engine.jdbc.dialect.spi.DialectResolutionInfo;
import org.hibernate.service.ServiceRegistry;
import org.hibernate.type.SqlTypes;
import org.hibernate.type.descriptor.jdbc.JdbcType;
import org.hibernate.type.descriptor.jdbc.JsonJdbcType;
import org.hibernate.type.descriptor.jdbc.TimestampUtcAsJdbcTimestampJdbcType;
import org.hibernate.type.descriptor.jdbc.spi.JdbcTypeRegistry;

/**
 * 벤더 번역이 만든 Oracle 스키마와 엔티티 매핑을 잇는다(ADR-0047 결정 8).
 *
 * <p>기본 설정(MAX_STRING_SIZE=STANDARD)의 {@code VARCHAR2} 는 4,000바이트까지라 글자 수 1,000 을 넘는 문자열은 CLOB 이고,
 * 19c 에는 JSON 타입이 없어 JSON 도 {@code IS JSON} CHECK 를 건 CLOB 이다. 엔티티는 PostgreSQL 과 공유하므로 벤더마다 고치지 않고
 * 스키마 검증에 이 동등성을 알린다. 드라이버가 문자열과 CLOB 을 그대로 잇는다.
 */
public class NuriOracleDialect extends OracleDialect {

    public NuriOracleDialect() {
    }

    public NuriOracleDialect(DatabaseVersion version) {
        super(version);
    }

    public NuriOracleDialect(DialectResolutionInfo info) {
        super(info);
    }

    @Override
    public boolean equivalentTypes(int first, int second) {
        return super.equivalentTypes(first, second) || storedAsClob(first, second) || storedAsClob(second, first)
                || storedAsBlob(first, second) || storedAsBlob(second, first);
    }

    private static boolean storedAsClob(int columnType, int mappedType) {
        return (columnType == Types.CLOB || columnType == Types.NCLOB)
                && (mappedType == Types.VARCHAR || mappedType == Types.NVARCHAR || mappedType == Types.LONGVARCHAR
                || mappedType == SqlTypes.JSON);
    }

    private static boolean storedAsBlob(int columnType, int mappedType) {
        return columnType == Types.BLOB && (mappedType == Types.VARBINARY || mappedType == Types.LONGVARBINARY);
    }

    /** 네이티브 조회의 투영이 {@code String} 을 받는다. CLOB 을 그대로 두면 LOB 프록시가 돌아와 변환에 실패한다. */
    @Override
    public JdbcType resolveSqlTypeDescriptor(String columnTypeName, int jdbcTypeCode, int precision, int scale, JdbcTypeRegistry registry) {
        if (jdbcTypeCode == Types.CLOB || jdbcTypeCode == Types.NCLOB) {
            return registry.getDescriptor(Types.LONGVARCHAR);
        }
        return super.resolveSqlTypeDescriptor(columnTypeName, jdbcTypeCode, precision, scale, registry);
    }

    @Override
    public void contributeTypes(TypeContributions typeContributions, ServiceRegistry serviceRegistry) {
        super.contributeTypes(typeContributions, serviceRegistry);
        applyStoredTypes(typeContributions.getTypeConfiguration().getJdbcTypeRegistry());
    }

    /**
     * 벤더 기본 매핑 대신 번역이 만든 물리 타입에 맞춘다. JSON 은 19c 와 23 계열 모두 CLOB 에 문자열로 저장한다.
     * {@code Instant} 컬럼은 시간대가 없고, Oracle 드라이버는 그 컬럼을 시간대 있는 값으로 읽기를 거부한다(ORA-18716).
     * UTC 기준의 시각으로 저장해 JVM 시간대가 바뀌어도, 일광 절약 경계를 지나도 같은 순간으로 읽는다.
     */
    static void applyStoredTypes(JdbcTypeRegistry registry) {
        registry.addDescriptor(JsonJdbcType.INSTANCE);
        registry.addDescriptor(TimestampUtcAsJdbcTimestampJdbcType.INSTANCE);
    }
}
