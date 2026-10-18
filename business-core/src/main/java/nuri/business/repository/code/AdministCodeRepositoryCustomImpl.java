package nuri.business.repository.code;

import jakarta.persistence.EntityManager;
import nuri.business.domain.code.AdministCode;

public class AdministCodeRepositoryCustomImpl implements AdministCodeRepositoryCustom {
    private final EntityManager entityManager;

    public AdministCodeRepositoryCustomImpl(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Override
    public void insert(AdministCode code) {
        entityManager.persist(code);
        entityManager.flush();
    }
}
