package com.company.project.domain.recentsearchword;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 최근 검색어 Repository
 */
public interface RecentSearchwordRepository extends JpaRepository<RecentSearchword, String> {
    Page<RecentSearchword> findBySearchwordManageId(String searchwordManageId, Pageable pageable);

    Page<RecentSearchword> findBySearchwordNmContaining(String searchwordNm, Pageable pageable);

    void deleteBySearchwordManageId(String searchwordManageId);
}
