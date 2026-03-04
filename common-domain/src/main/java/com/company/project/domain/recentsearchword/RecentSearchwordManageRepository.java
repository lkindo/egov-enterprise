package com.company.project.domain.recentsearchword;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 최근 검색어 관리 Repository
 */
public interface RecentSearchwordManageRepository extends JpaRepository<RecentSearchwordManage, String> {
    Page<RecentSearchwordManage> findBySearchwordManageNmContaining(String searchwordManageNm, Pageable pageable);
}