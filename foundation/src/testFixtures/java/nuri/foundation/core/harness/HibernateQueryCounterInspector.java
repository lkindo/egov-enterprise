package nuri.foundation.core.harness;

import org.hibernate.resource.jdbc.spi.StatementInspector;
import org.springframework.stereotype.Component;

/**
 * Hibernate 실행 쿼리를 모니터링하여 카운터를 물리적으로 격상시키는 인스펙터 (테스트용 피스처)
 */
@Component
public class HibernateQueryCounterInspector implements StatementInspector {

    @Override
    public String inspect(String sql) {
        QueryCountInspector.increment(sql);
        return sql;
    }
}
