package com.company.project.domain.auth;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AuthorityRoleRepositoryCustom {
    Page<AuthorRoleProjection> searchAuthorRoles(String authorCode, Pageable pageable);
}
