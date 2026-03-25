package com.company.project.foundation.domain.auth;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserAuthorityRepositoryCustom {
    Page<AuthorGroupProjection> searchAuthorGroups(String searchCondition, String searchKeyword, Pageable pageable);
    Page<DeptAuthorProjection> searchDeptAuthors(String deptCode, Pageable pageable);
}
