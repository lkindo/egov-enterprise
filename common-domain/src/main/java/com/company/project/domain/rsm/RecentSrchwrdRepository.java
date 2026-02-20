package com.company.project.domain.rsm;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 筌ㅼ뮄??野꺜??깅선 ?類ｋ궖 Repository
 */
public interface RecentSrchwrdRepository extends JpaRepository<RecentSrchwrd, String> {
    Page<RecentSrchwrd> findBySrchwrdManageId(String srchwrdManageId, Pageable pageable);
    Page<RecentSrchwrd> findBySrchwrdNmContaining(String srchwrdNm, Pageable pageable);
    void deleteBySrchwrdManageId(String srchwrdManageId);
}
