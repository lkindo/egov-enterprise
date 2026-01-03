package com.company.project.domain.user;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface GeneralUserRepositoryCustom {
    Page<GeneralUser> searchGeneralUsers(String sbscrbSttus, String searchCondition, String searchKeyword,
            Pageable pageable);
}
