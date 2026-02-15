package com.company.project.domain.ctsnn;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 경조사 Repository
 */
@org.springframework.stereotype.Repository("ctsnnCtsnnManageRepository")
public interface CtsnnManageRepository extends JpaRepository<CtsnnManage, String> {
    Page<CtsnnManage> findByCtsnnNmContaining(String ctsnnNm, Pageable pageable);

    Page<CtsnnManage> findByUsid(String usid, Pageable pageable);
}
