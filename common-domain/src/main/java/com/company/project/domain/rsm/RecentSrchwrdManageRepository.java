package com.company.project.domain.rsm;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 최근 검색어 관리 Repository
 */
public interface RecentSrchwrdManageRepository extends JpaRepository<RecentSrchwrdManage, String> {
    Page<RecentSrchwrdManage> findBySrchwrdManageNmContaining(String srchwrdManageNm, Pageable pageable);
}
