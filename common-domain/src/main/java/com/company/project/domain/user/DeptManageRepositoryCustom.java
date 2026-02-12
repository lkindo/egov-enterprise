package com.company.project.domain.user;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 부서 정보 Repository Custom 인터페이스
 */
public interface DeptManageRepositoryCustom {
    Page<DeptManage> searchDeptManages(String keyword, Pageable pageable);
}
