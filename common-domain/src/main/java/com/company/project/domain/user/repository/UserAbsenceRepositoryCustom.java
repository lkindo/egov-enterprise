package com.company.project.domain.user.repository;

import com.company.project.domain.user.vo.*;
import com.company.project.domain.user.entity.*;


import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserAbsenceRepositoryCustom {
    Page<UserAbsenceSearchResult> search(UserAbsenceSearchCondition condition, Pageable pageable);
}
