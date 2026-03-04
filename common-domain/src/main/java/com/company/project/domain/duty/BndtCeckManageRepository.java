package com.company.project.domain.duty;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * ?諭彛?筌ｋ똾寃??온??Repository
 */
public interface BndtCeckManageRepository extends JpaRepository<BndtCeckManage, BndtCeckManageId>, BndtCeckManageRepositoryCustom {
}