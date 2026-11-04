package nuri.foundation.core.persistence;

import org.hibernate.dialect.Dialect;
import org.hibernate.engine.jdbc.dialect.spi.DialectResolutionInfo;
import org.hibernate.engine.jdbc.dialect.spi.DialectResolver;

/** 설정 없이 JDBC 제품명으로 {@link NuriSqlServerDialect} 를 고른다. 다른 제품은 표준 해석에 넘긴다. */
public class NuriSqlServerDialectResolver implements DialectResolver {

    @Override
    public Dialect resolveDialect(DialectResolutionInfo info) {
        return "Microsoft SQL Server".equals(info.getDatabaseName()) ? new NuriSqlServerDialect(info) : null;
    }
}
