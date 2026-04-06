package nuri.foundation.domain.user.repository;

import nuri.foundation.domain.user.entity.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * ??????? Repository
 */
public interface DeptManageRepository extends JpaRepository<DeptManage, String>, DeptManageRepositoryCustom {
    Page<DeptManage> findByOrgnztNmContainingIgnoreCase(String orgnztNm, Pageable pageable);
    Page<DeptManage> findByOrgnztDcContainingIgnoreCase(String orgnztDc, Pageable pageable);
    long countByOrgnztNmContainingIgnoreCase(String orgnztNm);
    long countByOrgnztDcContainingIgnoreCase(String orgnztDc);
}
