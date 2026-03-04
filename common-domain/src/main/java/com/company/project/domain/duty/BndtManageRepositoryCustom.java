package com.company.project.domain.duty;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * ?諭彛??類ｋ궖 Repository Custom ?紐낃숲??륁뵠??
 */
public interface BndtManageRepositoryCustom {
    Page<BndtManage> searchBndtManageList(String bndtDe, Pageable pageable);
}