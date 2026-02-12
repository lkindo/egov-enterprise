package com.company.project.domain.duty;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 당직 체크 관리 Repository
 */
public interface BndtCeckManageRepository extends JpaRepository<BndtCeckManage, BndtCeckManageId>, BndtCeckManageRepositoryCustom {
}
