package nuri.business.domain.user.repository;

import nuri.business.domain.user.entity.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * 부서 관리 Repository 사용자 정의 인터페이스(QueryDSL 검색)
 */
public interface DeptManageRepositoryCustom {
    interface ParentLink {
        String getOgnzId();
        String getUpOgnzId();
    }

    Page<DeptManage> searchDeptManages(String keyword, Pageable pageable);

    /** 계층 변경끼리 같은 순서로 잠그고, 대기한 변경은 앞선 커밋의 부모 관계를 다시 읽는다. */
    java.util.List<ParentLink> findParentLinksForUpdate();
}
