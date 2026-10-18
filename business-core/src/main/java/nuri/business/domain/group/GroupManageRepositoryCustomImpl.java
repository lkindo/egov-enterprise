package nuri.business.domain.group;

import jakarta.persistence.EntityManager;

public class GroupManageRepositoryCustomImpl implements GroupManageRepositoryCustom {
    private final EntityManager entityManager;

    public GroupManageRepositoryCustomImpl(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Override
    public void insert(GroupManage group) {
        entityManager.persist(group);
        entityManager.flush();
    }
}
