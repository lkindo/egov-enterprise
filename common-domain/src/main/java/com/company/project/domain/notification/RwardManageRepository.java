package com.company.project.domain.notification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RwardManageRepository extends JpaRepository<RwardManage, String> {
    Page<RwardManage> findByRwardNmContaining(String keyword, Pageable pageable);
}
