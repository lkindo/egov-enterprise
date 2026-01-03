package com.company.project.domain.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuthorityRepository extends JpaRepository<Authority, String>, AuthorityRepositoryCustom {

    @Query("SELECT a FROM Authority a WHERE a.authorNm LIKE %:searchKeyword% OR a.authorCode LIKE %:searchKeyword%")
    Page<Authority> searchByKeyword(@Param("searchKeyword") String searchKeyword, Pageable pageable);
}
