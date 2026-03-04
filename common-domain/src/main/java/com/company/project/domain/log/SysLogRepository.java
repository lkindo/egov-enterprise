package com.company.project.domain.log;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SysLogRepository extends JpaRepository<SysLog, String>, SysLogRepositoryCustom {
}