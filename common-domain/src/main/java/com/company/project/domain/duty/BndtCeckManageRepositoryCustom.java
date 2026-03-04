package com.company.project.domain.duty;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * ?諭彛?筌ｋ똾寃??온??Repository Custom ?紐낃숲??륁뵠??
 */
public interface BndtCeckManageRepositoryCustom {
    Page<BndtCeckManage> searchBndtCeckManageList(String bndtCeckSe, String useAt, String bndtCeckCdNm, Pageable pageable);
}