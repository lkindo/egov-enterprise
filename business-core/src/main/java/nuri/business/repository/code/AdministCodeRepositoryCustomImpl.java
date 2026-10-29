package nuri.business.repository.code;

import jakarta.persistence.EntityManager;
import nuri.business.domain.code.AdministCode;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

public class AdministCodeRepositoryCustomImpl implements AdministCodeRepositoryCustom {
    // One graph-wide key: locking just the moved node/parent misses longer, disjoint-endpoint cycles.
    // The two-int key space is separate from DurableWorkService's single-bigint keys.
    private static final int HIERARCHY_NAMESPACE = 0x41444D43; // ADMC
    private final EntityManager entityManager;
    private final JdbcTemplate jdbc;

    public AdministCodeRepositoryCustomImpl(EntityManager entityManager, JdbcTemplate jdbc) {
        this.entityManager = entityManager;
        this.jdbc = jdbc;
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void lockHierarchy() {
        // Native advisory locks do not use the JPA lock hint. Match application.yml's 5000 ms bound.
        // Transaction-local configuration also bounds subsequent row/FK waits and never leaks to the pool.
        jdbc.queryForObject("SELECT set_config('lock_timeout', '5s', true)", String.class);
        jdbc.query("SELECT pg_advisory_xact_lock(?, ?)", statement -> {
            statement.setInt(1, HIERARCHY_NAMESPACE);
            statement.setInt(2, 1);
        }, (RowCallbackHandler) row -> { });
    }

    @Override
    public void insert(AdministCode code) {
        entityManager.persist(code);
        entityManager.flush();
    }
}
