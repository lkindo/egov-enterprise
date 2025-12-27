package com.company.project.domain.auth;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AuthorityRepositoryCustom {
    Page<Authority> searchAuthorities(String searchCondition, String searchKeyword, Pageable pageable);
}
