package com.company.project.domain.duty;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * 당직 정보 Repository
 */
public interface BndtManageRepository extends JpaRepository<BndtManage, BndtManageId>, BndtManageRepositoryCustom {
    List<BndtManage> findByBndtDeStartingWith(String bndtDePrefix);
    Page<BndtManage> findByBndtDeStartingWith(String bndtDePrefix, Pageable pageable);
}
