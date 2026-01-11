package com.company.project.domain.duty;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BndtManageRepository extends JpaRepository<BndtManage, BndtManageId> {
    List<BndtManage> findByBndtDeLike(String bndtDePattern);

    int countByBndtDeLike(String bndtDePattern);
}
