package com.company.project.domain.auth;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RoleInfoRepository extends JpaRepository<RoleInfo, String>, RoleInfoRepositoryCustom {

    @Query("SELECT r FROM RoleInfo r WHERE r.roleNm LIKE %:searchKeyword%")
    Page<RoleInfo> searchByKeyword(@Param("searchKeyword") String searchKeyword, Pageable pageable);
}
