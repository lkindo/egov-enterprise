package com.company.project.domain.auth;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface RoleInfoRepositoryCustom {
    Page<RoleInfoProjection> selectRoleList(String searchKeyword, Pageable pageable);
}