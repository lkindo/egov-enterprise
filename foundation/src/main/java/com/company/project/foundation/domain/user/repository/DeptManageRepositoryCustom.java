package com.company.project.foundation.domain.user.repository;

import com.company.project.foundation.domain.user.entity.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * ??????? Repository Custom ????????
 */
public interface DeptManageRepositoryCustom {
    Page<DeptManage> searchDeptManages(String keyword, Pageable pageable);
}
