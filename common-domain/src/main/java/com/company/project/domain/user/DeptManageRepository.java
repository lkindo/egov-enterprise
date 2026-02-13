package com.company.project.domain.user;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 부서 정보 Repository
 */
public interface DeptManageRepository extends JpaRepository<DeptManage, String>, DeptManageRepositoryCustom {
    Page<DeptManage> findByOrgnztNmContainingIgnoreCase(String orgnztNm, Pageable pageable);
    Page<DeptManage> findByOrgnztDcContainingIgnoreCase(String orgnztDc, Pageable pageable);
    long countByOrgnztNmContainingIgnoreCase(String orgnztNm);
    long countByOrgnztDcContainingIgnoreCase(String orgnztDc);
}
