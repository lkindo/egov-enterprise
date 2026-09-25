package nuri.business.domain.template;

import jakarta.persistence.EntityManager;

public class TemplateRepositoryCustomImpl implements TemplateRepositoryCustom {
    private final EntityManager entityManager;

    public TemplateRepositoryCustomImpl(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Override
    public void insert(Template template) {
        // save() would merge an assigned ID; persist makes the PK constraint authoritative.
        entityManager.persist(template);
        entityManager.flush();
    }
}
