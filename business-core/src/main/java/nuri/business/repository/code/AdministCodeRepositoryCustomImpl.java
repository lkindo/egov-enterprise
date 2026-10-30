package nuri.business.repository.code;

import jakarta.persistence.EntityManager;
import java.time.Duration;
import nuri.business.domain.code.AdministCode;
import nuri.foundation.core.persistence.VendorSqlDialect;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

public class AdministCodeRepositoryCustomImpl implements AdministCodeRepositoryCustom {
    // One graph-wide key: locking just the moved node/parent misses longer, disjoint-endpoint cycles.
    // The two-int key space is separate from DurableWorkService's single-bigint keys.
    private static final int HIERARCHY_NAMESPACE = 0x41444D43; // ADMC
    private final EntityManager entityManager;
    private final JdbcTemplate jdbc;
    private final VendorSqlDialect vendorSql;

    public AdministCodeRepositoryCustomImpl(EntityManager entityManager, JdbcTemplate jdbc, VendorSqlDialect vendorSql) {
        this.entityManager = entityManager;
        this.jdbc = jdbc;
        this.vendorSql = vendorSql;
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void lockHierarchy() {
        // Native advisory locks do not use the JPA lock hint. Match application.yml's 5000 ms bound.
        // Transaction-local configuration also bounds subsequent row/FK waits and never leaks to the pool.
        jdbc.execute(vendorSql.transactionLockWaitSql(Duration.ofSeconds(5)));
        vendorSql.lockForTransaction(jdbc, HIERARCHY_NAMESPACE, 1);
    }

    @Override
    public void insert(AdministCode code) {
        entityManager.persist(code);
        entityManager.flush();
    }
}
