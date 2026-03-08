package com.company.project.domain.menu;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface BkmkMenuRepository extends JpaRepository<BkmkMenu, BkmkMenu.BkmkMenuId> {
    List<BkmkMenu> findByIdUserId(String userId);

    int countByIdUserId(String userId);
}
