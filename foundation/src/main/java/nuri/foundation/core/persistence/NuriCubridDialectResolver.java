package nuri.foundation.core.persistence;

import org.hibernate.dialect.Dialect;
import org.hibernate.engine.jdbc.dialect.spi.DialectResolutionInfo;
import org.hibernate.engine.jdbc.dialect.spi.DialectResolver;

/**
 * 설정 없이 JDBC 제품명으로 {@link NuriCubridDialect} 를 고른다. 다른 제품은 표준 해석에 넘긴다.
 *
 * <p>CUBRID 드라이버는 연결 메타데이터의 일부를 지원하지 않아 Hibernate 가 판을 0.0 으로 읽는다(2026-11-05 실측). 판으로 가르지 않는다.
 */
public class NuriCubridDialectResolver implements DialectResolver {

    @Override
    public Dialect resolveDialect(DialectResolutionInfo info) {
        return "CUBRID".equalsIgnoreCase(info.getDatabaseName()) ? new NuriCubridDialect(info) : null;
    }
}
