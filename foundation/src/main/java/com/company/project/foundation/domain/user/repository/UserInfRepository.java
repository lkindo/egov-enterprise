package com.company.project.foundation.domain.user.repository;

import com.company.project.foundation.domain.user.vo.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserInfRepository {
        Page<UserInfSearchResult> selectUserList(String searchCondition, String searchKeyword, Pageable pageable);
}
