package nuri.foundation.domain.user.repository;

import nuri.foundation.domain.user.entity.*;
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
}
