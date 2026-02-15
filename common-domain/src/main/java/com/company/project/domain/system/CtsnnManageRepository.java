package com.company.project.domain.system;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository("systemCtsnnManageRepository")
public interface CtsnnManageRepository extends JpaRepository<CtsnnManage, String> {
    Page<CtsnnManage> findByUsid(String usid, Pageable pageable);
}
