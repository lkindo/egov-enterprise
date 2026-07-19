package nuri.business.domain.user.repository;

import nuri.business.domain.user.entity.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * ??????? Repository
 */
public interface DeptManageRepository extends JpaRepository<DeptManage, String>, DeptManageRepositoryCustom {
    Page<DeptManage> findByOgnzNmContainingIgnoreCase(String ognzNm, Pageable pageable);
    Page<DeptManage> findByOgnzExplnContainingIgnoreCase(String ognzExpln, Pageable pageable);
    long countByOgnzNmContainingIgnoreCase(String ognzNm);
    long countByOgnzExplnContainingIgnoreCase(String ognzExpln);

    /** 하위 부서 수. 부서 삭제 가드에서 사용한다. [V2_26] */
    long countByUpOgnzId(String upOgnzId);
}
