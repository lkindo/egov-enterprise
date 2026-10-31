package nuri.foundation.core.persistence;

import org.hibernate.dialect.Dialect;
import org.hibernate.engine.jdbc.dialect.spi.DialectResolutionInfo;
import org.hibernate.engine.jdbc.dialect.spi.DialectResolver;

/** 설정 없이 JDBC 제품명으로 {@link NuriOracleDialect} 를 고른다. 다른 제품은 표준 해석에 넘긴다. */
public class NuriOracleDialectResolver implements DialectResolver {

    @Override
    public Dialect resolveDialect(DialectResolutionInfo info) {
        return "Oracle".equals(info.getDatabaseName()) ? new NuriOracleDialect(info) : null;
    }
}
