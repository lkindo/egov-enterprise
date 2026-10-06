package nuri.business.domain.user.repository;

import nuri.business.domain.user.entity.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 부서 관리 Repository 사용자 정의 인터페이스(QueryDSL 검색)
 */
public interface DeptManageRepositoryCustom {
    Page<DeptManage> searchDeptManages(String keyword, Pageable pageable);
}
