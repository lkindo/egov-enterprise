package com.company.project.domain.community;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommunityRepository extends JpaRepository<Community, String> {

    Page<Community> findByCmmntyNmContaining(String cmmntyNm, Pageable pageable);

    // Legacy support for searching by name
    @Query("SELECT c FROM Community c WHERE c.useAt = 'Y' AND (:searchWrd IS NULL OR c.cmmntyNm LIKE %:searchWrd%)")
    Page<Community> searchCommunities(@Param("searchWrd") String searchWrd, Pageable pageable);
}
