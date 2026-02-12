package com.company.project.domain.duty;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 당직 체크 관리 Repository Custom 인터페이스
 */
public interface BndtCeckManageRepositoryCustom {
    Page<BndtCeckManage> searchBndtCeckManageList(String bndtCeckSe, String useAt, String bndtCeckCdNm, Pageable pageable);
}
