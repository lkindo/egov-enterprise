package nuri.business.domain.system.policy;

import jakarta.persistence.EntityManager;

public class SystemPolicyRepositoryCustomImpl implements SystemPolicyRepositoryCustom {
    private final EntityManager entityManager;

    public SystemPolicyRepositoryCustomImpl(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Override
    public void insert(SystemPolicy policy) {
        entityManager.persist(policy);
        entityManager.flush();
    }
}
