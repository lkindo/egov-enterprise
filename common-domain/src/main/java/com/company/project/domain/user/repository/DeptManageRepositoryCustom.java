package com.company.project.domain.user.repository;

import com.company.project.domain.user.entity.*;


import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * ??????? Repository Custom ????????
 */
public interface DeptManageRepositoryCustom {
    Page<DeptManage> searchDeptManages(String keyword, Pageable pageable);
}
