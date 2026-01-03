package com.company.project.domain.user;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EnterpriseUserRepositoryCustom {
    Page<EnterpriseUser> searchEnterpriseUsers(String sbscrbSttus, String searchCondition, String searchKeyword,
            Pageable pageable);
}
