package com.company.project.domain.login;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface LoginPolicyRepositoryCustom {
    Page<LoginPolicySearchResult> search(LoginPolicySearchCondition condition, Pageable pageable);
}