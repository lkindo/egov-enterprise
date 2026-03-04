package com.company.project.domain.user.repository;

import com.company.project.domain.user.vo.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface UserInfRepository {
        Page<UserInfSearchResult> selectUserList(String searchCondition, String searchKeyword, Pageable pageable);

        Page<UserInfSearchResult> selectCmmntyUserList(String trgetId, String searchCondition, String searchKeyword,
                        Pageable pageable);

        Page<UserInfSearchResult> selectCmmntyMngrList(String trgetId, String searchCondition, String searchKeyword,
                        Pageable pageable);

        List<UserInfSearchResult> selectAllCmmntyUser(String trgetId);
}
