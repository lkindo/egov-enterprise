package com.company.project.domain.duty;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BndtCeckManageRepository extends JpaRepository<BndtCeckManage, BndtCeckManageId> {
    // Add custom finders if needed (e.g. by Se/Cd like)
}
