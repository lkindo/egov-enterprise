package com.company.project.domain.log;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 로그인 로그 JPA Repository
 */
@Repository
public interface LoginLogRepository extends JpaRepository<LoginLog, String> {
    List<LoginLog> findByConectMthd(String conectMthd);

    List<LoginLog> findTop100ByOrderByCreatDtDesc();
}
