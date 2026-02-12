package com.company.project.domain.duty;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 당직 정보 Repository Custom 인터페이스
 */
public interface BndtManageRepositoryCustom {
    Page<BndtManage> searchBndtManageList(String bndtDe, Pageable pageable);
}
