package com.company.project.domain.user;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 부서 정보 Repository
 */
public interface DeptManageRepository extends JpaRepository<DeptManage, String>, DeptManageRepositoryCustom {
}
