package com.company.project.domain.user;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserRepositoryCustom {
    Page<User> searchUsers(String sbscrbSttus, String searchCondition, String searchKeyword, Pageable pageable);

    int checkIdDplct(String checkId);
}
